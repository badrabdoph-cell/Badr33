// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, asc, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var siteContent = mysqlTable("site_content", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  label: varchar("label", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var siteImages = mysqlTable("site_images", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  url: text("url").notNull(),
  alt: varchar("alt", { length: 200 }),
  category: varchar("category", { length: 50 }).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var portfolioImages = mysqlTable("portfolio_images", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  url: text("url").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  visible: boolean("visible").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var siteSections = mysqlTable("site_sections", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  visible: boolean("visible").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  page: varchar("page", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var packages = mysqlTable("packages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  price: varchar("price", { length: 50 }).notNull(),
  description: text("description"),
  features: json("features").$type(),
  category: varchar("category", { length: 50 }).notNull(),
  popular: boolean("popular").default(false),
  visible: boolean("visible").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var testimonials = mysqlTable("testimonials", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  quote: text("quote").notNull(),
  visible: boolean("visible").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var contactInfo = mysqlTable("contact_info", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  label: varchar("label", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var shareLinks = mysqlTable("share_links", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 120 }).notNull().unique(),
  note: text("note"),
  expiresAt: timestamp("expiresAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var DEFAULT_ADMIN_USER = "Badrabdoph3399";
var DEFAULT_ADMIN_PASS = "Badr@3399";
var DEFAULT_COOKIE_SECRET = "local-admin-secret";
var isProduction = process.env.NODE_ENV === "production";
var adminUser = process.env.ADMIN_USER ?? DEFAULT_ADMIN_USER;
var adminPass = process.env.ADMIN_PASS ?? DEFAULT_ADMIN_PASS;
var cookieSecret = process.env.JWT_SECRET ?? DEFAULT_COOKIE_SECRET;
var adminBypass = (process.env.ADMIN_BYPASS ?? "false") === "true";
var adminSessionTtlMinutes = Number.parseInt(process.env.ADMIN_SESSION_TTL_MINUTES ?? "120", 10);
var adminLoginWindowMs = Number.parseInt(process.env.ADMIN_LOGIN_WINDOW_MS ?? "600000", 10);
var adminLoginMaxAttempts = Number.parseInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS ?? "5", 10);
var adminLoginBlockMs = Number.parseInt(process.env.ADMIN_LOGIN_BLOCK_MS ?? "1800000", 10);
var adminRequireHttps = (process.env.ADMIN_REQUIRE_HTTPS ?? (isProduction ? "true" : "false")) === "true";
var adminEnvIssues = [];
if (isProduction) {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    adminEnvIssues.push("ADMIN_USER/ADMIN_PASS \u063A\u064A\u0631 \u0645\u062D\u062F\u062F\u064A\u0646");
  }
  if (adminUser === DEFAULT_ADMIN_USER || adminPass === DEFAULT_ADMIN_PASS) {
    adminEnvIssues.push("\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0623\u062F\u0645\u0646 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D\u0629");
  }
  if (!process.env.JWT_SECRET || cookieSecret === DEFAULT_COOKIE_SECRET) {
    adminEnvIssues.push("JWT_SECRET \u063A\u064A\u0631 \u0645\u062D\u062F\u062F \u0628\u0642\u064A\u0645\u0629 \u0642\u0648\u064A\u0629");
  }
  if (adminBypass) {
    adminEnvIssues.push("ADMIN_BYPASS \u0645\u0641\u0639\u0651\u0644");
  }
}
var adminLoginDisabled = isProduction && adminEnvIssues.length > 0;
if (adminEnvIssues.length > 0) {
  console.warn(
    `[Admin] \u062A\u062D\u0630\u064A\u0631 \u0625\u0639\u062F\u0627\u062F\u0627\u062A: ${adminEnvIssues.join(", ")}`
  );
}
var ENV = {
  appId: process.env.VITE_APP_ID ?? "local-admin-app",
  cookieSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  adminBypass,
  adminUser,
  adminPass,
  adminSessionTtlMinutes: Number.isFinite(adminSessionTtlMinutes) && adminSessionTtlMinutes > 0 ? adminSessionTtlMinutes : 120,
  adminLoginWindowMs: Number.isFinite(adminLoginWindowMs) && adminLoginWindowMs > 0 ? adminLoginWindowMs : 6e5,
  adminLoginMaxAttempts: Number.isFinite(adminLoginMaxAttempts) && adminLoginMaxAttempts > 0 ? adminLoginMaxAttempts : 5,
  adminLoginBlockMs: Number.isFinite(adminLoginBlockMs) && adminLoginBlockMs > 0 ? adminLoginBlockMs : 18e5,
  adminRequireHttps,
  adminLoginDisabled,
  adminEnvIssues
};

// server/_core/shareLinkStore.ts
import fs from "fs/promises";
import path from "path";
var storeFile = process.env.SHARE_LINKS_FILE ?? path.resolve(process.cwd(), "data", "share-links.json");
var store = null;
var loading = null;
async function ensureStoreLoaded() {
  if (store) return;
  if (loading) {
    await loading;
    return;
  }
  loading = (async () => {
    try {
      const raw = await fs.readFile(storeFile, "utf8");
      const parsed = JSON.parse(raw);
      store = new Map(
        parsed.map((item) => [
          item.code,
          {
            id: item.id,
            code: item.code,
            note: item.note ?? null,
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
            revokedAt: item.revokedAt ? new Date(item.revokedAt) : null
          }
        ])
      );
    } catch (error) {
      if (error?.code !== "ENOENT") {
        console.warn("[ShareLinks] Failed to load fallback store:", error);
      }
      store = /* @__PURE__ */ new Map();
    }
  })();
  await loading;
  loading = null;
}
async function persistStore() {
  if (!store) return;
  const dir = path.dirname(storeFile);
  await fs.mkdir(dir, { recursive: true });
  const data = Array.from(store.values()).map((item) => ({
    id: item.id,
    code: item.code,
    note: item.note ?? null,
    expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    revokedAt: item.revokedAt ? item.revokedAt.toISOString() : null
  }));
  await fs.writeFile(storeFile, JSON.stringify(data, null, 2), "utf8");
}
function nextId() {
  return Math.floor(Date.now() + Math.random() * 1e3);
}
async function createLocalShareLink(data) {
  await ensureStoreLoaded();
  const existing = store?.get(data.code ?? "");
  if (existing) return null;
  const now = /* @__PURE__ */ new Date();
  const record = {
    id: nextId(),
    code: data.code,
    note: data.note ?? null,
    expiresAt: data.expiresAt ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
    revokedAt: data.revokedAt ?? null
  };
  store?.set(data.code, record);
  await persistStore();
  return record;
}
async function getLocalShareLinkByCode(code) {
  await ensureStoreLoaded();
  return store?.get(code) ?? null;
}
async function listLocalShareLinks() {
  await ensureStoreLoaded();
  return Array.from(store?.values() ?? []).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}
async function revokeLocalShareLink(code) {
  await ensureStoreLoaded();
  const record = store?.get(code);
  if (!record) return false;
  const now = /* @__PURE__ */ new Date();
  record.revokedAt = now;
  record.updatedAt = now;
  store?.set(code, record);
  await persistStore();
  return true;
}
async function extendLocalShareLink(code, newExpiresAt) {
  await ensureStoreLoaded();
  const record = store?.get(code);
  if (!record) return null;
  record.expiresAt = newExpiresAt;
  record.updatedAt = /* @__PURE__ */ new Date();
  store?.set(code, record);
  await persistStore();
  return record;
}

// server/_core/siteContentStore.ts
import fs2 from "fs/promises";
import path2 from "path";
var storeFile2 = process.env.SITE_CONTENT_FILE ?? path2.resolve(process.cwd(), "data", "site-content.json");
var store2 = null;
var loading2 = null;
async function ensureStoreLoaded2() {
  if (store2) return;
  if (loading2) {
    await loading2;
    return;
  }
  loading2 = (async () => {
    try {
      const raw = await fs2.readFile(storeFile2, "utf8");
      const parsed = JSON.parse(raw);
      store2 = new Map(
        parsed.map((item) => [
          item.key,
          {
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          }
        ])
      );
    } catch (error) {
      if (error?.code !== "ENOENT") {
        console.warn("[SiteContent] Failed to load fallback store:", error);
      }
      store2 = /* @__PURE__ */ new Map();
    }
  })();
  await loading2;
  loading2 = null;
}
async function persistStore2() {
  if (!store2) return;
  const dir = path2.dirname(storeFile2);
  await fs2.mkdir(dir, { recursive: true });
  const data = Array.from(store2.values()).map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  }));
  await fs2.writeFile(storeFile2, JSON.stringify(data, null, 2), "utf8");
}
function nextId2() {
  return Math.floor(Date.now() + Math.random() * 1e3);
}
async function listLocalSiteContent() {
  await ensureStoreLoaded2();
  return Array.from(store2?.values() ?? []).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}
async function getLocalSiteContentByKey(key) {
  await ensureStoreLoaded2();
  return store2?.get(key) ?? null;
}
async function upsertLocalSiteContent(data) {
  await ensureStoreLoaded2();
  const existing = store2?.get(data.key);
  const now = /* @__PURE__ */ new Date();
  const record = {
    id: existing?.id ?? nextId2(),
    key: data.key,
    value: data.value,
    category: data.category,
    label: data.label ?? existing?.label ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  store2?.set(data.key, record);
  await persistStore2();
  return record;
}
async function deleteLocalSiteContent(key) {
  await ensureStoreLoaded2();
  const existed = store2?.delete(key) ?? false;
  if (existed) {
    await persistStore2();
  }
  return existed;
}

// server/db.ts
var _db = null;
var _pool = null;
async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      if (!_pool) {
        _pool = mysql.createPool(ENV.databaseUrl);
      }
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllSiteContent() {
  const db = await getDb();
  if (!db) return await listLocalSiteContent();
  return await db.select().from(siteContent);
}
async function getSiteContentByKey(key) {
  const db = await getDb();
  if (!db) return await getLocalSiteContentByKey(key);
  const result = await db.select().from(siteContent).where(eq(siteContent.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function upsertSiteContent(data) {
  const db = await getDb();
  if (!db) return await upsertLocalSiteContent(data);
  await db.insert(siteContent).values(data).onDuplicateKeyUpdate({
    set: { value: data.value, label: data.label, category: data.category }
  });
  return await getSiteContentByKey(data.key);
}
async function deleteSiteContent(key) {
  const db = await getDb();
  if (!db) return await deleteLocalSiteContent(key);
  await db.delete(siteContent).where(eq(siteContent.key, key));
  return true;
}
async function getAllSiteImages() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(siteImages).orderBy(asc(siteImages.sortOrder));
}
async function getSiteImageByKey(key) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(siteImages).where(eq(siteImages.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function upsertSiteImage(data) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(siteImages).values(data).onDuplicateKeyUpdate({
    set: { url: data.url, alt: data.alt, category: data.category, sortOrder: data.sortOrder }
  });
  return await getSiteImageByKey(data.key);
}
async function deleteSiteImage(key) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(siteImages).where(eq(siteImages.key, key));
  return true;
}
async function createShareLinkRecord(data) {
  const db = await getDb();
  if (!db) {
    return await createLocalShareLink(data);
  }
  const existing = await getShareLinkByCode(data.code);
  if (existing) return null;
  await db.insert(shareLinks).values(data);
  return await getShareLinkByCode(data.code);
}
async function getShareLinkByCode(code) {
  const db = await getDb();
  if (!db) {
    return await getLocalShareLinkByCode(code);
  }
  const result = await db.select().from(shareLinks).where(eq(shareLinks.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function listShareLinks() {
  const db = await getDb();
  if (!db) {
    return await listLocalShareLinks();
  }
  return await db.select().from(shareLinks).orderBy(desc(shareLinks.createdAt));
}
async function revokeShareLink(code) {
  const db = await getDb();
  if (!db) {
    return await revokeLocalShareLink(code);
  }
  const now = /* @__PURE__ */ new Date();
  await db.update(shareLinks).set({ revokedAt: now }).where(eq(shareLinks.code, code));
  return true;
}
async function extendShareLink(code, hours) {
  const record = await getShareLinkByCode(code);
  if (!record) return null;
  if (!record.expiresAt) return null;
  const now = /* @__PURE__ */ new Date();
  const base = record.expiresAt && record.expiresAt.getTime() > now.getTime() ? record.expiresAt : now;
  const newExpiresAt = new Date(base.getTime() + hours * 60 * 60 * 1e3);
  const db = await getDb();
  if (!db) {
    return await extendLocalShareLink(code, newExpiresAt);
  }
  await db.update(shareLinks).set({ expiresAt: newExpiresAt }).where(eq(shareLinks.code, code));
  return {
    ...record,
    expiresAt: newExpiresAt
  };
}
async function getAllPortfolioImages() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(portfolioImages).orderBy(asc(portfolioImages.sortOrder));
}
async function getPortfolioImageById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(portfolioImages).where(eq(portfolioImages.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function createPortfolioImage(data) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(portfolioImages).values(data);
  const insertId = result[0].insertId;
  return await getPortfolioImageById(insertId);
}
async function updatePortfolioImage(id, data) {
  const db = await getDb();
  if (!db) return null;
  await db.update(portfolioImages).set(data).where(eq(portfolioImages.id, id));
  return await getPortfolioImageById(id);
}
async function deletePortfolioImage(id) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(portfolioImages).where(eq(portfolioImages.id, id));
  return true;
}
async function getAllSiteSections() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(siteSections).orderBy(asc(siteSections.sortOrder));
}
async function getSiteSectionByKey(key) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(siteSections).where(eq(siteSections.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function upsertSiteSection(data) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(siteSections).values(data).onDuplicateKeyUpdate({
    set: { name: data.name, visible: data.visible, sortOrder: data.sortOrder, page: data.page }
  });
  return await getSiteSectionByKey(data.key);
}
async function updateSiteSectionVisibility(key, visible) {
  const db = await getDb();
  if (!db) return null;
  await db.update(siteSections).set({ visible }).where(eq(siteSections.key, key));
  return await getSiteSectionByKey(key);
}
async function getAllPackages() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(packages).orderBy(asc(packages.sortOrder));
}
async function getPackageById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(packages).where(eq(packages.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function createPackage(data) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(packages).values(data);
  const insertId = result[0].insertId;
  return await getPackageById(insertId);
}
async function updatePackage(id, data) {
  const db = await getDb();
  if (!db) return null;
  await db.update(packages).set(data).where(eq(packages.id, id));
  return await getPackageById(id);
}
async function deletePackage(id) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(packages).where(eq(packages.id, id));
  return true;
}
async function getAllTestimonials() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder));
}
async function getTestimonialById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function createTestimonial(data) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(testimonials).values(data);
  const insertId = result[0].insertId;
  return await getTestimonialById(insertId);
}
async function updateTestimonial(id, data) {
  const db = await getDb();
  if (!db) return null;
  await db.update(testimonials).set(data).where(eq(testimonials.id, id));
  return await getTestimonialById(id);
}
async function deleteTestimonial(id) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(testimonials).where(eq(testimonials.id, id));
  return true;
}
async function getAllContactInfo() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contactInfo);
}
async function getContactInfoByKey(key) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(contactInfo).where(eq(contactInfo.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function upsertContactInfo(data) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(contactInfo).values(data).onDuplicateKeyUpdate({
    set: { value: data.value, label: data.label }
  });
  return await getContactInfoByKey(data.key);
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  const sameSite = secure ? "none" : "lax";
  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name: typeof name === "string" ? name : ""
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (ENV.adminBypass) {
      return next({
        ctx: {
          ...ctx,
          user: ctx.user ?? { role: "admin" }
        }
      });
    }
    if (ctx.adminAccess) {
      return next({
        ctx: {
          ...ctx,
          user: ctx.user
        }
      });
    }
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/storage.ts
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

// server/routers.ts
import { nanoid as nanoid2 } from "nanoid";

// server/_core/shareLinks.ts
import { SignJWT as SignJWT2, jwtVerify as jwtVerify2 } from "jose";
import { nanoid, customAlphabet } from "nanoid";
import { createHmac } from "crypto";
var SHARE_LINK_ISSUER = "badr-photography";
var SHARE_LINK_AUDIENCE = "share-link";
var SHARE_LINK_SUBJECT = "site-share";
var SHARE_CODE_PREFIX = "badrabdoph";
var SHARE_CODE_SIGNATURE_LENGTH = 6;
var SHARE_CODE_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
var SHARE_CODE_MIN_LENGTH = 3;
var SHARE_CODE_MAX_LENGTH = 8;
var SHARE_CODE_DEFAULT_LENGTH = 6;
var SHARE_CODE_LENGTH = Math.min(
  Math.max(
    Number.parseInt(
      process.env.SHARE_CODE_LENGTH ?? String(SHARE_CODE_DEFAULT_LENGTH),
      10
    ),
    SHARE_CODE_MIN_LENGTH
  ),
  SHARE_CODE_MAX_LENGTH
);
var generateShortCode = customAlphabet(SHARE_CODE_ALPHABET, SHARE_CODE_LENGTH);
var shortCodeRegex = new RegExp(`^[${SHARE_CODE_ALPHABET}]{${SHARE_CODE_MIN_LENGTH},${SHARE_CODE_MAX_LENGTH}}$`);
function getShareLinkSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}
async function verifyShareLink(token) {
  try {
    const { payload } = await jwtVerify2(token, getShareLinkSecret(), {
      issuer: SHARE_LINK_ISSUER,
      audience: SHARE_LINK_AUDIENCE,
      subject: SHARE_LINK_SUBJECT
    });
    const expiresAt = typeof payload.exp === "number" ? new Date(payload.exp * 1e3) : null;
    return { valid: true, expiresAt };
  } catch {
    return { valid: false, expiresAt: null };
  }
}
function signShortPayload(payload) {
  const secret = ENV.cookieSecret;
  const digest = createHmac("sha256", secret).update(payload).digest("base64url");
  return digest.slice(0, SHARE_CODE_SIGNATURE_LENGTH);
}
function decodeExpiry(encoded) {
  const seconds = Number.parseInt(encoded, 36);
  if (!Number.isFinite(seconds)) return null;
  return new Date(seconds * 1e3);
}
function createShortShareCode(expiresInMs) {
  const issuedAt = Date.now();
  const expiresAt = new Date(issuedAt + expiresInMs);
  const code = generateShortCode();
  return { code, expiresAt };
}
function verifyShortShareCode(code) {
  if (!code) {
    return { valid: false, expiresAt: null, legacy: false, expired: false };
  }
  if (!code.startsWith(`${SHARE_CODE_PREFIX}-`)) {
    const isValid = shortCodeRegex.test(code);
    return { valid: isValid, expiresAt: null, legacy: false, expired: false };
  }
  const raw = code.slice(SHARE_CODE_PREFIX.length + 1);
  const lastDot = raw.lastIndexOf(".");
  if (lastDot <= 0) {
    return { valid: false, expiresAt: null, legacy: true, expired: false };
  }
  const payload = raw.slice(0, lastDot);
  const signature = raw.slice(lastDot + 1);
  if (!payload || !signature) {
    return { valid: false, expiresAt: null, legacy: true, expired: false };
  }
  const expected = signShortPayload(payload);
  if (signature !== expected) {
    return { valid: false, expiresAt: null, legacy: true, expired: false };
  }
  const [expiryEncoded] = payload.split(".");
  if (!expiryEncoded) {
    return { valid: false, expiresAt: null, legacy: true, expired: false };
  }
  const expiresAt = decodeExpiry(expiryEncoded);
  if (!expiresAt) {
    return { valid: false, expiresAt: null, legacy: true, expired: false };
  }
  if (expiresAt.getTime() <= Date.now()) {
    return { valid: true, expiresAt, legacy: true, expired: true };
  }
  return { valid: true, expiresAt, legacy: true, expired: false };
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/_core/adminAuth.ts
import { SignJWT as SignJWT3, jwtVerify as jwtVerify3 } from "jose";
import { timingSafeEqual } from "crypto";
import { parse as parseCookieHeader2 } from "cookie";
var ADMIN_COOKIE_NAME = "admin_access";
var ADMIN_SESSION_TTL_MS = Math.min(Math.max(ENV.adminSessionTtlMinutes, 15), 720) * 60 * 1e3;
var ADMIN_SESSION_ISSUER = "badr-photography-admin";
var ADMIN_SESSION_AUDIENCE = "admin-panel";
var ADMIN_SESSION_SUBJECT = "admin";
var ADMIN_LOGIN_WINDOW_MS = ENV.adminLoginWindowMs;
var ADMIN_LOGIN_MAX_ATTEMPTS = ENV.adminLoginMaxAttempts;
var ADMIN_LOGIN_BLOCK_MS = ENV.adminLoginBlockMs;
function getAdminSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}
function safeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
function matchesAdminCredentials(username, password) {
  return safeEqual(username, ENV.adminUser) && safeEqual(password, ENV.adminPass);
}
var adminLoginAttempts = /* @__PURE__ */ new Map();
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}
function isRequestSecure(req) {
  const proto = req.headers["x-forwarded-proto"];
  return req.secure || typeof proto === "string" && proto.includes("https");
}
function checkAdminLoginRateLimit(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const entry = adminLoginAttempts.get(ip);
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.blockedUntil - now };
  }
  if (!entry || now - entry.firstAt > ADMIN_LOGIN_WINDOW_MS) {
    return { allowed: true, retryAfterMs: 0 };
  }
  if (entry.count >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: ADMIN_LOGIN_BLOCK_MS };
  }
  return { allowed: true, retryAfterMs: 0 };
}
function recordAdminLoginFailure(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const entry = adminLoginAttempts.get(ip);
  if (!entry || now - entry.firstAt > ADMIN_LOGIN_WINDOW_MS) {
    const next = { count: 1, firstAt: now };
    if (next.count >= ADMIN_LOGIN_MAX_ATTEMPTS) {
      next.blockedUntil = now + ADMIN_LOGIN_BLOCK_MS;
    }
    adminLoginAttempts.set(ip, next);
    return next;
  }
  entry.count += 1;
  if (entry.count >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    entry.blockedUntil = now + ADMIN_LOGIN_BLOCK_MS;
  }
  adminLoginAttempts.set(ip, entry);
  return entry;
}
function clearAdminLoginFailures(req) {
  const ip = getClientIp(req);
  adminLoginAttempts.delete(ip);
}
function getAdminLoginBackoffMs(attemptCount) {
  const base = 350;
  const delay = base + Math.min(attemptCount * 250, 2e3);
  return Math.max(0, delay);
}
async function createAdminSession(expiresInMs = ADMIN_SESSION_TTL_MS) {
  const issuedAt = Date.now();
  const expiresAt = new Date(issuedAt + expiresInMs);
  const token = await new SignJWT3({}).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt(Math.floor(issuedAt / 1e3)).setExpirationTime(Math.floor(expiresAt.getTime() / 1e3)).setIssuer(ADMIN_SESSION_ISSUER).setAudience(ADMIN_SESSION_AUDIENCE).setSubject(ADMIN_SESSION_SUBJECT).sign(getAdminSecret());
  return { token, expiresAt };
}
async function verifyAdminSession(token) {
  if (!token) return { valid: false, expiresAt: null };
  try {
    const { payload } = await jwtVerify3(token, getAdminSecret(), {
      issuer: ADMIN_SESSION_ISSUER,
      audience: ADMIN_SESSION_AUDIENCE,
      subject: ADMIN_SESSION_SUBJECT
    });
    const expiresAt = typeof payload.exp === "number" ? new Date(payload.exp * 1e3) : null;
    return { valid: true, expiresAt };
  } catch {
    return { valid: false, expiresAt: null };
  }
}
function getAdminCookieOptions(req) {
  const isSecure = isRequestSecure(req) || ENV.isProduction;
  const sameSite = isSecure ? "strict" : "lax";
  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure: isSecure
  };
}
function setAdminSessionCookie(req, res, token, expiresInMs = ADMIN_SESSION_TTL_MS) {
  res.cookie(ADMIN_COOKIE_NAME, token, {
    ...getAdminCookieOptions(req),
    maxAge: expiresInMs
  });
}
function clearAdminSessionCookie(req, res) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    ...getAdminCookieOptions(req),
    maxAge: -1
  });
}
async function getAdminSessionFromRequest(req) {
  const cookies = parseCookieHeader2(req.headers.cookie ?? "");
  const token = cookies[ADMIN_COOKIE_NAME];
  return await verifyAdminSession(token);
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // Admin Access (Username/Password)
  adminAccess: router({
    status: publicProcedure.query(({ ctx }) => {
      return {
        authenticated: ctx.adminAccess,
        expiresAt: ctx.adminExpiresAt ? ctx.adminExpiresAt.toISOString() : null,
        loginDisabled: ENV.adminLoginDisabled,
        envIssues: ENV.adminEnvIssues
      };
    }),
    login: publicProcedure.input(
      z2.object({
        username: z2.string().min(1),
        password: z2.string().min(1)
      })
    ).mutation(async ({ ctx, input }) => {
      if (ENV.adminLoginDisabled) {
        throw new TRPCError3({
          code: "FORBIDDEN",
          message: "\u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0627\u0644\u0623\u062F\u0645\u0646 \u0645\u0639\u0637\u0651\u0644 \u0628\u0633\u0628\u0628 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u063A\u064A\u0631 \u0622\u0645\u0646\u0629."
        });
      }
      if (ENV.adminRequireHttps && !isRequestSecure(ctx.req)) {
        throw new TRPCError3({
          code: "FORBIDDEN",
          message: "\u0644\u0627\u0632\u0645 \u062A\u0633\u062A\u062E\u062F\u0645 HTTPS \u0639\u0644\u0634\u0627\u0646 \u062A\u0633\u062C\u0644 \u062F\u062E\u0648\u0644 \u0627\u0644\u0623\u062F\u0645\u0646."
        });
      }
      const rateStatus = checkAdminLoginRateLimit(ctx.req);
      if (!rateStatus.allowed) {
        const seconds = Math.max(1, Math.ceil(rateStatus.retryAfterMs / 1e3));
        throw new TRPCError3({
          code: "TOO_MANY_REQUESTS",
          message: `\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0643\u062B\u064A\u0631\u0629. \u062C\u0631\u0651\u0628 \u0628\u0639\u062F ${seconds} \u062B\u0627\u0646\u064A\u0629.`
        });
      }
      const ok = matchesAdminCredentials(input.username, input.password);
      if (!ok) {
        const entry = recordAdminLoginFailure(ctx.req);
        const delayMs = getAdminLoginBackoffMs(entry.count);
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const { token, expiresAt } = await createAdminSession();
      clearAdminLoginFailures(ctx.req);
      setAdminSessionCookie(ctx.req, ctx.res, token);
      return {
        success: true,
        expiresAt: expiresAt.toISOString()
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearAdminSessionCookie(ctx.req, ctx.res);
      return { success: true };
    })
  }),
  // Temporary Share Links
  shareLinks: router({
    list: adminProcedure.query(async () => {
      const links = await listShareLinks();
      return links.map((link) => ({
        code: link.code,
        note: link.note ?? null,
        expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
        createdAt: link.createdAt.toISOString(),
        revokedAt: link.revokedAt ? link.revokedAt.toISOString() : null
      }));
    }),
    create: adminProcedure.input(
      z2.object({
        ttlHours: z2.number().int().min(1).max(168).optional(),
        permanent: z2.boolean().optional(),
        note: z2.string().max(200).optional()
      })
    ).mutation(async ({ input }) => {
      if (!input.permanent && !input.ttlHours) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "\u062D\u062F\u062F \u0645\u062F\u0629 \u0635\u062D\u064A\u062D\u0629 \u0623\u0648 \u0627\u062E\u062A\u0631 \u0631\u0627\u0628\u0637 \u062F\u0627\u0626\u0645."
        });
      }
      const expiresInMs = input.ttlHours ? input.ttlHours * 60 * 60 * 1e3 : 0;
      const note = input.note ?? null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const { code, expiresAt } = createShortShareCode(expiresInMs || 1);
        const record = await createShareLinkRecord({
          code,
          note,
          expiresAt: input.permanent ? null : expiresAt
        });
        if (!record) {
          continue;
        }
        return {
          code: record.code,
          expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
          note: record.note ?? null,
          permanent: !record.expiresAt
        };
      }
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0627\u0628\u0637 \u062C\u062F\u064A\u062F\u060C \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
      });
    }),
    revoke: adminProcedure.input(z2.object({ code: z2.string().min(4) })).mutation(async ({ input }) => {
      await revokeShareLink(input.code);
      return { success: true };
    }),
    extend: adminProcedure.input(
      z2.object({
        code: z2.string().min(4),
        hours: z2.number().int().min(1).max(168)
      })
    ).mutation(async ({ input }) => {
      const record = await getShareLinkByCode(input.code);
      if (!record) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "\u0627\u0644\u0631\u0627\u0628\u0637 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      if (record.revokedAt) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0645\u062F\u064A\u062F \u0631\u0627\u0628\u0637 \u0645\u0644\u063A\u064A" });
      }
      if (!record.expiresAt) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0645\u062F\u064A\u062F \u0631\u0627\u0628\u0637 \u062F\u0627\u0626\u0645" });
      }
      const updated = await extendShareLink(input.code, input.hours);
      if (!updated) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "\u062A\u0639\u0630\u0631 \u062A\u0645\u062F\u064A\u062F \u0627\u0644\u0631\u0627\u0628\u0637" });
      }
      return {
        expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null
      };
    }),
    validate: publicProcedure.input(z2.object({ token: z2.string().min(10) })).query(async ({ input }) => {
      const result = await verifyShareLink(input.token);
      return {
        valid: result.valid,
        expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null
      };
    }),
    validateShort: publicProcedure.input(z2.object({ code: z2.string().min(3).max(120) })).query(async ({ input }) => {
      const result = verifyShortShareCode(input.code);
      if (!result.valid) {
        return {
          valid: false,
          expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null
        };
      }
      const record = await getShareLinkByCode(input.code);
      if (!record) {
        return {
          valid: result.legacy ? !result.expired : false,
          expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null
        };
      }
      if (record.revokedAt) {
        return {
          valid: false,
          expiresAt: record.expiresAt?.toISOString() ?? null
        };
      }
      if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
        return {
          valid: false,
          expiresAt: record.expiresAt.toISOString()
        };
      }
      return {
        valid: true,
        expiresAt: record.expiresAt?.toISOString() ?? result.expiresAt?.toISOString() ?? null
      };
    })
  }),
  // Contact form submission with owner notification
  contact: router({
    submit: publicProcedure.input(
      z2.object({
        name: z2.string().min(2, "\u0627\u0644\u0627\u0633\u0645 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u062D\u0631\u0641\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"),
        phone: z2.string().min(10, "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
        date: z2.string().min(1, "\u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u062A\u0627\u0631\u064A\u062E"),
        message: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      const title = `\u{1F4F8} \u0637\u0644\u0628 \u062D\u062C\u0632 \u062C\u062F\u064A\u062F \u0645\u0646 ${input.name}`;
      const content = `
**\u0637\u0644\u0628 \u062D\u062C\u0632 \u062C\u062F\u064A\u062F**

**\u0627\u0644\u0627\u0633\u0645:** ${input.name}
**\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641:** ${input.phone}
**\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629:** ${input.date}
${input.message ? `**\u062A\u0641\u0627\u0635\u064A\u0644 \u0625\u0636\u0627\u0641\u064A\u0629:** ${input.message}` : ""}

---
\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0645\u0646 \u0645\u0648\u0642\u0639 Badr Bado Photography
        `.trim();
      const delivered = await notifyOwner({ title, content });
      return {
        success: true,
        notificationSent: delivered
      };
    })
  }),
  // ============================================
  // Admin CMS API
  // ============================================
  // Site Content Management
  siteContent: router({
    getAll: publicProcedure.query(async () => {
      return await getAllSiteContent();
    }),
    getByKey: publicProcedure.input(z2.object({ key: z2.string() })).query(async ({ input }) => {
      return await getSiteContentByKey(input.key);
    }),
    upsert: adminProcedure.input(z2.object({
      key: z2.string(),
      value: z2.string(),
      category: z2.string(),
      label: z2.string().optional()
    })).mutation(async ({ input }) => {
      return await upsertSiteContent(input);
    }),
    delete: adminProcedure.input(z2.object({ key: z2.string() })).mutation(async ({ input }) => {
      return await deleteSiteContent(input.key);
    })
  }),
  // Site Images Management
  siteImages: router({
    getAll: publicProcedure.query(async () => {
      return await getAllSiteImages();
    }),
    getByKey: publicProcedure.input(z2.object({ key: z2.string() })).query(async ({ input }) => {
      return await getSiteImageByKey(input.key);
    }),
    upsert: adminProcedure.input(z2.object({
      key: z2.string(),
      url: z2.string(),
      alt: z2.string().optional(),
      category: z2.string(),
      sortOrder: z2.number().optional()
    })).mutation(async ({ input }) => {
      return await upsertSiteImage(input);
    }),
    upload: adminProcedure.input(z2.object({
      key: z2.string(),
      base64: z2.string(),
      mimeType: z2.string(),
      alt: z2.string().optional(),
      category: z2.string()
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType.split("/")[1] || "jpg";
      const fileKey = `images/${input.key}-${nanoid2(8)}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return await upsertSiteImage({
        key: input.key,
        url,
        alt: input.alt,
        category: input.category
      });
    }),
    delete: adminProcedure.input(z2.object({ key: z2.string() })).mutation(async ({ input }) => {
      return await deleteSiteImage(input.key);
    })
  }),
  // Portfolio Images Management
  portfolio: router({
    getAll: publicProcedure.query(async () => {
      return await getAllPortfolioImages();
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getPortfolioImageById(input.id);
    }),
    create: adminProcedure.input(z2.object({
      title: z2.string(),
      url: z2.string(),
      category: z2.string(),
      visible: z2.boolean().optional(),
      sortOrder: z2.number().optional()
    })).mutation(async ({ input }) => {
      return await createPortfolioImage(input);
    }),
    upload: adminProcedure.input(z2.object({
      title: z2.string(),
      base64: z2.string(),
      mimeType: z2.string(),
      category: z2.string(),
      visible: z2.boolean().optional()
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType.split("/")[1] || "jpg";
      const fileKey = `portfolio/${nanoid2(12)}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return await createPortfolioImage({
        title: input.title,
        url,
        category: input.category,
        visible: input.visible ?? true
      });
    }),
    update: adminProcedure.input(z2.object({
      id: z2.number(),
      title: z2.string().optional(),
      url: z2.string().optional(),
      category: z2.string().optional(),
      visible: z2.boolean().optional(),
      sortOrder: z2.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updatePortfolioImage(id, data);
    }),
    delete: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return await deletePortfolioImage(input.id);
    })
  }),
  // Site Sections Management
  sections: router({
    getAll: publicProcedure.query(async () => {
      return await getAllSiteSections();
    }),
    getByKey: publicProcedure.input(z2.object({ key: z2.string() })).query(async ({ input }) => {
      return await getSiteSectionByKey(input.key);
    }),
    upsert: adminProcedure.input(z2.object({
      key: z2.string(),
      name: z2.string(),
      visible: z2.boolean(),
      sortOrder: z2.number().optional(),
      page: z2.string()
    })).mutation(async ({ input }) => {
      return await upsertSiteSection(input);
    }),
    toggleVisibility: adminProcedure.input(z2.object({
      key: z2.string(),
      visible: z2.boolean()
    })).mutation(async ({ input }) => {
      return await updateSiteSectionVisibility(input.key, input.visible);
    })
  }),
  // Packages Management
  packages: router({
    getAll: publicProcedure.query(async () => {
      return await getAllPackages();
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getPackageById(input.id);
    }),
    create: adminProcedure.input(z2.object({
      name: z2.string(),
      price: z2.string(),
      description: z2.string().optional(),
      features: z2.array(z2.string()).optional(),
      category: z2.string(),
      popular: z2.boolean().optional(),
      visible: z2.boolean().optional(),
      sortOrder: z2.number().optional()
    })).mutation(async ({ input }) => {
      return await createPackage(input);
    }),
    update: adminProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().optional(),
      price: z2.string().optional(),
      description: z2.string().optional(),
      features: z2.array(z2.string()).optional(),
      category: z2.string().optional(),
      popular: z2.boolean().optional(),
      visible: z2.boolean().optional(),
      sortOrder: z2.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updatePackage(id, data);
    }),
    delete: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return await deletePackage(input.id);
    })
  }),
  // Testimonials Management
  testimonials: router({
    getAll: publicProcedure.query(async () => {
      return await getAllTestimonials();
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return await getTestimonialById(input.id);
    }),
    create: adminProcedure.input(z2.object({
      name: z2.string(),
      quote: z2.string(),
      visible: z2.boolean().optional(),
      sortOrder: z2.number().optional()
    })).mutation(async ({ input }) => {
      return await createTestimonial(input);
    }),
    update: adminProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().optional(),
      quote: z2.string().optional(),
      visible: z2.boolean().optional(),
      sortOrder: z2.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateTestimonial(id, data);
    }),
    delete: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return await deleteTestimonial(input.id);
    })
  }),
  // Contact Info Management
  contactInfo: router({
    getAll: publicProcedure.query(async () => {
      return await getAllContactInfo();
    }),
    getByKey: publicProcedure.input(z2.object({ key: z2.string() })).query(async ({ input }) => {
      return await getContactInfoByKey(input.key);
    }),
    upsert: adminProcedure.input(z2.object({
      key: z2.string(),
      value: z2.string(),
      label: z2.string().optional()
    })).mutation(async ({ input }) => {
      return await upsertContactInfo(input);
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  let adminAccess = false;
  let adminExpiresAt = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  try {
    const adminSession = await getAdminSessionFromRequest(opts.req);
    adminAccess = adminSession.valid;
    adminExpiresAt = adminSession.expiresAt;
  } catch {
    adminAccess = false;
    adminExpiresAt = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
    adminAccess,
    adminExpiresAt
  };
}

// server/_core/vite.ts
import express from "express";
import fs4 from "fs";
import { nanoid as nanoid3 } from "nanoid";
import path4 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs3 from "node:fs";
import path3 from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path3.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs3.existsSync(LOG_DIR)) {
    fs3.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs3.existsSync(logPath) || fs3.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs3.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs3.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path3.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs3.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path3.resolve(import.meta.dirname),
  root: path3.resolve(import.meta.dirname, "client"),
  publicDir: path3.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react") || id.includes("react-dom")) return "react";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("@trpc") || id.includes("@tanstack")) return "trpc";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("recharts")) return "charts";
          return "vendor";
        }
      }
    }
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid3()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path4.resolve(import.meta.dirname, "../..", "dist", "public") : path4.resolve(import.meta.dirname, "public");
  if (!fs4.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const proto = req.headers["x-forwarded-proto"];
    const isSecure = req.secure || typeof proto === "string" && proto.includes("https");
    const isProd = process.env.NODE_ENV === "production";
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    if (isProd && isSecure) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    const isAdminPath = req.path.startsWith("/admin");
    res.setHeader("X-Frame-Options", isAdminPath ? "DENY" : "SAMEORIGIN");
    if (isAdminPath) {
      res.setHeader("Cache-Control", "no-store");
    }
    if (isProd) {
      const csp = [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'self'",
        "img-src 'self' data: https:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "script-src 'self' https:",
        "connect-src 'self' https:"
      ].join("; ");
      res.setHeader("Content-Security-Policy", csp);
    }
    next();
  });
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
