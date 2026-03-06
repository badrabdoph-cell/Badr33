import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { z } from "zod";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import * as db from "./db";
import { createShortShareCode, verifyShareLink, verifyShortShareCode } from "./_core/shareLinks";
import { TRPCError } from "@trpc/server";
import {
  clearAdminSessionCookie,
  createAdminSession,
  checkAdminLoginRateLimit,
  clearAdminLoginFailures,
  getAdminLoginBackoffMs,
  isRequestSecure,
  matchesAdminCredentials,
  recordAdminLoginFailure,
  setAdminSessionCookie,
} from "./_core/adminAuth";
import { ENV } from "./_core/env";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Admin Access (Username/Password)
  adminAccess: router({
    status: publicProcedure.query(async ({ ctx }) => {
      let expiresAt = ctx.adminExpiresAt;
      if (ctx.adminAccess && ctx.adminExpiresAt) {
        const remainingMs = ctx.adminExpiresAt.getTime() - Date.now();
        if (remainingMs < 5 * 60 * 1000) {
          const nextSession = await createAdminSession();
          setAdminSessionCookie(ctx.req, ctx.res, nextSession.token);
          expiresAt = nextSession.expiresAt;
        }
      }
      return {
        authenticated: ctx.adminAccess,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        loginDisabled: ENV.adminLoginDisabled,
        envIssues: ENV.adminEnvIssues,
      };
    }),
    login: publicProcedure
      .input(
        z.object({
          username: z.string().min(1),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ENV.adminLoginDisabled) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "تسجيل دخول الأدمن معطّل بسبب إعدادات غير آمنة.",
          });
        }

        if (ENV.adminRequireHttps && !isRequestSecure(ctx.req)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "لازم تستخدم HTTPS علشان تسجل دخول الأدمن.",
          });
        }

        const rateStatus = checkAdminLoginRateLimit(ctx.req);
        if (!rateStatus.allowed) {
          const seconds = Math.max(1, Math.ceil(rateStatus.retryAfterMs / 1000));
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `محاولات كثيرة. جرّب بعد ${seconds} ثانية.`,
          });
        }

        const ok = matchesAdminCredentials(input.username, input.password);
        if (!ok) {
          const entry = recordAdminLoginFailure(ctx.req);
          const delayMs = getAdminLoginBackoffMs(entry.count);
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات الدخول غير صحيحة" });
        }

        const { token, expiresAt } = await createAdminSession();
        clearAdminLoginFailures(ctx.req);
        setAdminSessionCookie(ctx.req, ctx.res, token);

        return {
          success: true,
          expiresAt: expiresAt.toISOString(),
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearAdminSessionCookie(ctx.req, ctx.res);
      return { success: true };
    }),
  }),

  // Temporary Share Links
  shareLinks: router({
    list: adminProcedure.query(async () => {
      const links = await db.listShareLinks();
      return links.map((link) => ({
        code: link.code,
        note: link.note ?? null,
        expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
        createdAt: link.createdAt.toISOString(),
        revokedAt: link.revokedAt ? link.revokedAt.toISOString() : null,
      }));
    }),
    create: adminProcedure
      .input(
        z.object({
          ttlHours: z.number().int().min(1).max(168).optional(),
          permanent: z.boolean().optional(),
          note: z.string().max(200).optional(),
        })
      )
      .mutation(async ({ input }) => {
        if (!input.permanent && !input.ttlHours) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "حدد مدة صحيحة أو اختر رابط دائم.",
          });
        }
        const expiresInMs = input.ttlHours ? input.ttlHours * 60 * 60 * 1000 : 0;
        const note = input.note ?? null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const { code, expiresAt } = createShortShareCode(expiresInMs || 1);
          const record = await db.createShareLinkRecord({
            code,
            note,
            expiresAt: input.permanent ? null : expiresAt,
          });
          if (!record) {
            continue;
          }

          return {
            code: record.code,
            expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
            note: record.note ?? null,
            permanent: !record.expiresAt,
          };
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "تعذر إنشاء رابط جديد، حاول مرة أخرى.",
        });
      }),
    revoke: adminProcedure
      .input(z.object({ code: z.string().min(4) }))
      .mutation(async ({ input }) => {
        await db.revokeShareLink(input.code);
        return { success: true };
      }),
    extend: adminProcedure
      .input(
        z.object({
          code: z.string().min(4),
          hours: z.number().int().min(1).max(168),
        })
      )
      .mutation(async ({ input }) => {
        const record = await db.getShareLinkByCode(input.code);
        if (!record) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الرابط غير موجود" });
        }
        if (record.revokedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تمديد رابط ملغي" });
        }
        if (!record.expiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تمديد رابط دائم" });
        }

        const updated = await db.extendShareLink(input.code, input.hours);
        if (!updated) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر تمديد الرابط" });
        }

        return {
          expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null,
        };
      }),
    validate: publicProcedure
      .input(z.object({ token: z.string().min(10) }))
      .query(async ({ input }) => {
        const result = await verifyShareLink(input.token);

        return {
          valid: result.valid,
          expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null,
        };
      }),
    validateShort: publicProcedure
      .input(z.object({ code: z.string().min(3).max(120) }))
      .query(async ({ input }) => {
        const result = verifyShortShareCode(input.code);
        if (!result.valid) {
          return {
            valid: false,
            expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null,
          };
        }

        const record = await db.getShareLinkByCode(input.code);
        if (!record) {
          return {
            valid: result.legacy ? !result.expired : false,
            expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null,
          };
        }

        if (record.revokedAt) {
          return {
            valid: false,
            expiresAt: record.expiresAt?.toISOString() ?? null,
          };
        }

        if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
          return {
            valid: false,
            expiresAt: record.expiresAt.toISOString(),
          };
        }

        return {
          valid: true,
          expiresAt: record.expiresAt?.toISOString() ?? result.expiresAt?.toISOString() ?? null,
        };
      }),
  }),

  // Contact form submission with owner notification
  contact: router({
    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
          phone: z.string().min(10, "رقم الهاتف غير صحيح"),
          date: z.string().min(1, "يرجى اختيار التاريخ"),
          message: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const title = `📸 طلب حجز جديد من ${input.name}`;
        const content = `
**طلب حجز جديد**

**الاسم:** ${input.name}
**رقم الهاتف:** ${input.phone}
**تاريخ المناسبة:** ${input.date}
${input.message ? `**تفاصيل إضافية:** ${input.message}` : ""}

---
تم استلام هذا الطلب من موقع Badr Bado Photography
        `.trim();

        const delivered = await notifyOwner({ title, content });

        return {
          success: true,
          notificationSent: delivered,
        } as const;
      }),
  }),

  // ============================================
  // Admin CMS API
  // ============================================

  // Site Content Management
  siteContent: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllSiteContent();
    }),
    getByKey: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await db.getSiteContentByKey(input.key);
      }),
    upsert: adminProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
        category: z.string(),
        label: z.string().optional(),
        offsetX: z.number().nullable().optional(),
        offsetY: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.upsertSiteContent(input);
      }),
    delete: adminProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ input }) => {
        return await db.deleteSiteContent(input.key);
      }),
  }),

  // Site Images Management
  siteImages: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllSiteImages();
    }),
    getByKey: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await db.getSiteImageByKey(input.key);
      }),
    upsert: adminProcedure
      .input(z.object({
        key: z.string(),
        url: z.string(),
        alt: z.string().optional(),
        category: z.string(),
        sortOrder: z.number().optional(),
        offsetX: z.number().nullable().optional(),
        offsetY: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.upsertSiteImage(input);
      }),
    upload: adminProcedure
      .input(z.object({
        key: z.string(),
        base64: z.string(),
        mimeType: z.string(),
        alt: z.string().optional(),
        category: z.string(),
        offsetX: z.number().nullable().optional(),
        offsetY: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        // Convert base64 to buffer
        const buffer = Buffer.from(input.base64, 'base64');
        const ext = input.mimeType.split('/')[1] || 'jpg';
        const fileKey = `images/${input.key}-${nanoid(8)}.${ext}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Save to database
        return await db.upsertSiteImage({
          key: input.key,
          url,
          alt: input.alt,
          category: input.category,
          offsetX: input.offsetX,
          offsetY: input.offsetY,
        });
      }),
    delete: adminProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ input }) => {
        return await db.deleteSiteImage(input.key);
      }),
  }),

  // Portfolio Images Management
  portfolio: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllPortfolioImages();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPortfolioImageById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        title: z.string(),
        url: z.string(),
        category: z.string(),
        visible: z.boolean().optional(),
        sortOrder: z.number().optional(),
        offsetX: z.number().nullable().optional(),
        offsetY: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createPortfolioImage(input);
      }),
    upload: adminProcedure
      .input(z.object({
        title: z.string(),
        base64: z.string(),
        mimeType: z.string(),
        category: z.string(),
        visible: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, 'base64');
        const ext = input.mimeType.split('/')[1] || 'jpg';
        const fileKey = `portfolio/${nanoid(12)}.${ext}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        return await db.createPortfolioImage({
          title: input.title,
          url,
          category: input.category,
          visible: input.visible ?? true,
        });
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        url: z.string().optional(),
        category: z.string().optional(),
        visible: z.boolean().optional(),
        sortOrder: z.number().optional(),
        offsetX: z.number().nullable().optional(),
        offsetY: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updatePortfolioImage(id, data);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deletePortfolioImage(input.id);
      }),
  }),

  // Site Sections Management
  sections: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllSiteSections();
    }),
    getByKey: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await db.getSiteSectionByKey(input.key);
      }),
    upsert: adminProcedure
      .input(z.object({
        key: z.string(),
        name: z.string(),
        visible: z.boolean(),
        sortOrder: z.number().optional(),
        page: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.upsertSiteSection(input);
      }),
    toggleVisibility: adminProcedure
      .input(z.object({
        key: z.string(),
        visible: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateSiteSectionVisibility(input.key, input.visible);
      }),
  }),

  // Packages Management
  packages: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllPackages();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPackageById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        price: z.string(),
        description: z.string().optional(),
        features: z.array(z.string()).optional(),
        category: z.string(),
        popular: z.boolean().optional(),
        visible: z.boolean().optional(),
        sortOrder: z.number().optional(),
        offsetX: z.number().nullable().optional(),
        offsetY: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createPackage(input);
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        price: z.string().optional(),
        description: z.string().optional(),
        features: z.array(z.string()).optional(),
        category: z.string().optional(),
        popular: z.boolean().optional(),
        visible: z.boolean().optional(),
        sortOrder: z.number().optional(),
        offsetX: z.number().nullable().optional(),
        offsetY: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updatePackage(id, data);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deletePackage(input.id);
      }),
    history: router({
      getAll: adminProcedure.query(async () => {
        return await db.getPackageHistory();
      }),
      restore: adminProcedure
        .input(z.object({ entryId: z.number() }))
        .mutation(async ({ input }) => {
          return await db.restorePackageFromHistory(input.entryId);
        }),
      clear: adminProcedure.mutation(async () => {
        return await db.clearPackageHistory();
      }),
      snapshot: adminProcedure.mutation(async () => {
        return await db.snapshotPackageHistory();
      }),
    }),
  }),

  // Testimonials Management
  testimonials: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllTestimonials();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTestimonialById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        quote: z.string(),
        visible: z.boolean().optional(),
        sortOrder: z.number().optional(),
        offsetX: z.number().nullable().optional(),
        offsetY: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createTestimonial(input);
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        quote: z.string().optional(),
        visible: z.boolean().optional(),
        sortOrder: z.number().optional(),
        offsetX: z.number().nullable().optional(),
        offsetY: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateTestimonial(id, data);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteTestimonial(input.id);
      }),
  }),

  // FAQs Management
  faqs: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllFaqs();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getFaqById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        question: z.string(),
        answer: z.string(),
        visible: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createFaq(input);
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        question: z.string().optional(),
        answer: z.string().optional(),
        visible: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateFaq(id, data);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteFaq(input.id);
      }),
  }),

  // Contact Info Management
  contactInfo: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllContactInfo();
    }),
    getByKey: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await db.getContactInfoByKey(input.key);
      }),
    upsert: adminProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
        label: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.upsertContactInfo(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
