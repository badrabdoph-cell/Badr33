import { eq, asc, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import type { Pool } from "mysql2";
import { 
  InsertUser, 
  users, 
  siteContent, 
  siteImages, 
  portfolioImages, 
  siteSections, 
  packages, 
  testimonials, 
  faqs,
  contactInfo,
  shareLinks,
  InsertSiteContent,
  InsertSiteImage,
  InsertPortfolioImage,
  InsertSiteSection,
  InsertPackage,
  InsertTestimonial,
  InsertFaq,
  InsertContactInfo,
  InsertShareLink,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import {
  createLocalShareLink,
  getLocalShareLinkByCode,
  listLocalShareLinks,
  revokeLocalShareLink,
  extendLocalShareLink,
} from "./_core/shareLinkStore";
import {
  getLocalSiteContentByKey,
  listLocalSiteContent,
  upsertLocalSiteContent,
  deleteLocalSiteContent,
} from "./_core/siteContentStore";
import {
  listFileSiteImages,
  getFileSiteImageByKey,
  upsertFileSiteImage,
  deleteFileSiteImage,
  listFilePortfolioImages,
  getFilePortfolioImageById,
  createFilePortfolioImage,
  updateFilePortfolioImage,
  deleteFilePortfolioImage,
  listFileSiteSections,
  getFileSiteSectionByKey,
  upsertFileSiteSection,
  updateFileSiteSectionVisibility,
  listFilePackages,
  getFilePackageById,
  createFilePackage,
  updateFilePackage,
  deleteFilePackage,
  listFilePackageHistory,
  recordFilePackageHistory,
  restoreFilePackage,
  clearFilePackageHistory,
  listFileTestimonials,
  getFileTestimonialById,
  createFileTestimonial,
  updateFileTestimonial,
  deleteFileTestimonial,
  listFileFaqs,
  getFileFaqById,
  createFileFaq,
  updateFileFaq,
  deleteFileFaq,
  listFileContactInfo,
  getFileContactInfoByKey,
  upsertFileContactInfo,
  type PackageHistoryEntry,
} from "./_core/adminFileStore";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
const STORE_MODE = (process.env.ADMIN_STORE_MODE ?? "file").trim().toLowerCase();
const FORCE_FILE_STORE = (process.env.ADMIN_FORCE_FILE_STORE ?? "false") === "true";
let useFileStore = FORCE_FILE_STORE || STORE_MODE !== "db";
let storeModeLogged = false;
let dbDisabled = false;
let adminTablesReady = false;
let packagesSeeded = false;
let cleanupRan = false;

type Positionable = {
  offsetX?: number | null;
  offsetY?: number | null;
};

function stripPositionFields<T extends Record<string, any>>(data: T): Omit<T, "offsetX" | "offsetY"> {
  if (!data) return data as Omit<T, "offsetX" | "offsetY">;
  const { offsetX, offsetY, ...rest } = data;
  return rest as Omit<T, "offsetX" | "offsetY">;
}

function toDbPackageData(snapshot: any): InsertPackage {
  return {
    name: snapshot?.name ?? "",
    price: snapshot?.price ?? "",
    description: snapshot?.description ?? null,
    features: snapshot?.features ?? null,
    category: snapshot?.category ?? "session",
    popular: snapshot?.popular ?? false,
    visible: snapshot?.visible ?? true,
    sortOrder: snapshot?.sortOrder ?? 0,
  } as InsertPackage;
}

async function recordPackageHistory(
  action: PackageHistoryEntry["action"],
  snapshot: any
) {
  try {
    await recordFilePackageHistory(action, snapshot);
  } catch (error) {
    console.warn("[Database] Failed to record package history:", error);
  }
}

export async function getPackageHistory(): Promise<PackageHistoryEntry[]> {
  return await listFilePackageHistory();
}

export async function clearPackageHistory() {
  return await clearFilePackageHistory();
}

export async function snapshotPackageHistory() {
  const list = await getAllPackages();
  for (const pkg of list) {
    await recordPackageHistory("snapshot", pkg as any);
  }
  return true;
}

export async function restorePackageFromHistory(entryId: number) {
  const history = await listFilePackageHistory();
  const entry = history.find((item) => item.id === entryId);
  if (!entry) return null;
  const snapshot = entry.snapshot as any;
  if (useFileStore) {
    return await restoreFilePackage(snapshot, "restore");
  }
  const db = await getDb();
  if (!db) {
    return await restoreFilePackage(snapshot, "restore");
  }
  try {
    const existing = await db
      .select({ id: packages.id })
      .from(packages)
      .where(eq(packages.id, snapshot.id))
      .limit(1);
    const payload = toDbPackageData(snapshot);
    if (existing.length) {
      await db.update(packages).set(payload).where(eq(packages.id, snapshot.id));
    } else {
      await db.insert(packages).values({ id: snapshot.id, ...payload });
    }
    const restored = await getPackageById(snapshot.id);
    if (restored) {
      await recordPackageHistory("restore", restored);
    }
    return restored;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to restore package, falling back to file store:", error);
    return await restoreFilePackage(snapshot, "restore");
  }
}

function shouldDisableDbForError(error: unknown) {
  const anyError = error as any;
  const code = (anyError?.code ?? anyError?.cause?.code ?? "").toString();
  const message = String(anyError?.cause?.sqlMessage ?? anyError?.message ?? "");
  const lowered = message.toLowerCase();
  const disableCodes = new Set([
    "ER_NO_SUCH_TABLE",
    "ER_BAD_DB_ERROR",
    "ER_ACCESS_DENIED_ERROR",
    "ER_DBACCESS_DENIED_ERROR",
    "PROTOCOL_CONNECTION_LOST",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
  ]);
  if (disableCodes.has(code)) return true;
  return (
    lowered.includes("doesn't exist") ||
    lowered.includes("unknown database") ||
    lowered.includes("access denied")
  );
}

function flagDbDisabledForError(error: unknown) {
  if (!shouldDisableDbForError(error)) return;
  if (dbDisabled) return;
  dbDisabled = true;
  adminTablesReady = false;
  useFileStore = true;
  console.warn("[Database] Disabling DB after error; switching to file store.");
}

async function ensureAdminSchema(db: ReturnType<typeof drizzle>) {
  if (dbDisabled) return false;
  if (process.env.ADMIN_AUTO_SCHEMA === "false") return false;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(64) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        loginMethod VARCHAR(64),
        role ENUM('user','admin') NOT NULL DEFAULT 'user',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS site_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        label VARCHAR(200),
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS site_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) NOT NULL UNIQUE,
        url TEXT NOT NULL,
        alt VARCHAR(200),
        category VARCHAR(50) NOT NULL,
        sortOrder INT DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS portfolio_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        url TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        visible TINYINT(1) NOT NULL DEFAULT 1,
        sortOrder INT DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS site_sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        visible TINYINT(1) NOT NULL DEFAULT 1,
        sortOrder INT DEFAULT 0,
        page VARCHAR(50) NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        price VARCHAR(50) NOT NULL,
        description TEXT,
        features JSON,
        category VARCHAR(50) NOT NULL,
        popular TINYINT(1) DEFAULT 0,
        visible TINYINT(1) NOT NULL DEFAULT 1,
        sortOrder INT DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS testimonials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        quote TEXT NOT NULL,
        visible TINYINT(1) NOT NULL DEFAULT 1,
        sortOrder INT DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS faqs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question VARCHAR(300) NOT NULL,
        answer TEXT NOT NULL,
        visible TINYINT(1) NOT NULL DEFAULT 1,
        sortOrder INT DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contact_info (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        label VARCHAR(200),
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS share_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(120) NOT NULL UNIQUE,
        note TEXT,
        expiresAt TIMESTAMP NULL,
        revokedAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    return true;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to auto-create schema:", error);
    return false;
  }
}

async function ensureAdminTables(db: ReturnType<typeof drizzle>) {
  if (adminTablesReady || dbDisabled) return adminTablesReady;
  try {
    await db.select({ id: packages.id }).from(packages).limit(1);
    adminTablesReady = true;
    return true;
  } catch (error) {
    const missing = shouldDisableDbForError(error);
    if (missing) {
      const created = await ensureAdminSchema(db);
      if (created) {
        try {
          await db.select({ id: packages.id }).from(packages).limit(1);
          adminTablesReady = true;
          return true;
        } catch (retryError) {
          flagDbDisabledForError(retryError);
          console.warn("[Database] Schema created but verify failed:", retryError);
        }
      }
      flagDbDisabledForError(error);
      console.warn("[Database] Missing admin tables, falling back to file store:", error);
    } else {
      flagDbDisabledForError(error);
      console.warn("[Database] Failed to verify admin tables, falling back to file store:", error);
    }
    dbDisabled = true;
    return false;
  }
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!storeModeLogged) {
    storeModeLogged = true;
    console.log("[AdminStore] mode=%s forceFile=%s databaseUrl=%s", STORE_MODE, FORCE_FILE_STORE, ENV.databaseUrl ? "set" : "missing");
  }
  if (useFileStore || dbDisabled) return null;
  if (!_db && ENV.databaseUrl) {
    try {
      if (!_pool) {
        _pool = mysql.createPool(ENV.databaseUrl);
      }
      _db = drizzle(_pool);
      const ready = await ensureAdminTables(_db);
      if (!ready) {
        _db = null;
        return null;
      }
      await runCleanupOnce(_db);
    } catch (error) {
      flagDbDisabledForError(error);
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function runCleanupOnce(db: ReturnType<typeof drizzle>) {
  if (cleanupRan || useFileStore) return;
  cleanupRan = true;
  if (process.env.ADMIN_AUTO_CLEAN === "false") return;
  try {
    const legacyPattern = "سيشن\\+مطبوعات|جلسات\\s*التصوير\\s*\\+\\s*المطبوعات";

    await db.delete(packages).where(
      sql`(${packages.visible} = 0) OR (${packages.name} REGEXP ${legacyPattern})`
    );

    await db.delete(siteContent).where(eq(siteContent.value, ""));
    await db.delete(contactInfo).where(eq(contactInfo.value, ""));
    await db.delete(testimonials).where(eq(testimonials.visible, false));
    await db.delete(faqs).where(eq(faqs.visible, false));
    await db.delete(portfolioImages).where(eq(portfolioImages.visible, false));
    await db.delete(siteSections).where(eq(siteSections.visible, false));
    await db.delete(siteImages).where(eq(siteImages.url, ""));
    await db.delete(shareLinks).where(
      sql`revokedAt IS NOT NULL OR (expiresAt IS NOT NULL AND expiresAt < NOW())`
    );

    const packageRows = await db.select({ id: packages.id }).from(packages);
    const packageIdSet = new Set(packageRows.map((row) => String(row.id)));
    const contentRows = await db
      .select({ key: siteContent.key })
      .from(siteContent)
      .where(sql`${siteContent.key} LIKE 'package_%'`);

    const orphanKeys: string[] = [];
    for (const row of contentRows) {
      const key = row.key;
      const raw = key.replace(/^package_/, "");
      const idPart = raw.split("_")[0] ?? "";
      if (!idPart) continue;
      if (!packageIdSet.has(idPart)) {
        orphanKeys.push(key);
      }
    }
    if (orphanKeys.length) {
      await db.delete(siteContent).where(inArray(siteContent.key, orphanKeys));
    }
  } catch (error) {
    console.warn("[Cleanup] Failed to cleanup hidden/legacy data:", error);
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Site Content Functions
// ============================================

export async function getAllSiteContent() {
  if (useFileStore) return await listLocalSiteContent();
  const db = await getDb();
  if (!db) return await listLocalSiteContent();
  try {
    return await db.select().from(siteContent);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load site content, falling back to file store:", error);
    return await listLocalSiteContent();
  }
}

export async function getSiteContentByKey(key: string) {
  if (useFileStore) return await getLocalSiteContentByKey(key);
  const db = await getDb();
  if (!db) return await getLocalSiteContentByKey(key);
  try {
    const result = await db.select().from(siteContent).where(eq(siteContent.key, key)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load site content item, falling back to file store:", error);
    return await getLocalSiteContentByKey(key);
  }
}

export async function upsertSiteContent(data: InsertSiteContent & Positionable) {
  if (useFileStore) return await upsertLocalSiteContent(data);
  const db = await getDb();
  if (!db) return await upsertLocalSiteContent(data);

  try {
    const dbData = stripPositionFields(data);
    await db.insert(siteContent).values(dbData).onDuplicateKeyUpdate({
      set: { value: data.value, label: data.label, category: data.category },
    });
    return await getSiteContentByKey(data.key);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to upsert site content, falling back to file store:", error);
    return await upsertLocalSiteContent(data);
  }
}

export async function deleteSiteContent(key: string) {
  if (useFileStore) return await deleteLocalSiteContent(key);
  const db = await getDb();
  if (!db) return await deleteLocalSiteContent(key);
  try {
    await db.delete(siteContent).where(eq(siteContent.key, key));
    return true;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to delete site content, falling back to file store:", error);
    return await deleteLocalSiteContent(key);
  }
}

// ============================================
// Site Images Functions
// ============================================

export async function getAllSiteImages() {
  if (useFileStore) return await listFileSiteImages();
  const db = await getDb();
  if (!db) return await listFileSiteImages();
  try {
    return await db.select().from(siteImages).orderBy(asc(siteImages.sortOrder));
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load site images, falling back to file store:", error);
    return await listFileSiteImages();
  }
}

export async function getSiteImageByKey(key: string) {
  if (useFileStore) return await getFileSiteImageByKey(key);
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(siteImages).where(eq(siteImages.key, key)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load site image, falling back to file store:", error);
    return await getFileSiteImageByKey(key);
  }
}

export async function upsertSiteImage(data: InsertSiteImage & Positionable) {
  if (useFileStore) return await upsertFileSiteImage(data);
  const db = await getDb();
  if (!db) return null;

  try {
    const dbData = stripPositionFields(data);
    await db.insert(siteImages).values(dbData).onDuplicateKeyUpdate({
      set: { url: data.url, alt: data.alt, category: data.category, sortOrder: data.sortOrder },
    });
    return await getSiteImageByKey(data.key);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to upsert site image, falling back to file store:", error);
    return await upsertFileSiteImage(data);
  }
}

export async function deleteSiteImage(key: string) {
  if (useFileStore) return await deleteFileSiteImage(key);
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(siteImages).where(eq(siteImages.key, key));
    return true;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to delete site image, falling back to file store:", error);
    return await deleteFileSiteImage(key);
  }
}

// ============================================
// Share Links Functions
// ============================================

type ShareLinkRecord = {
  code: string;
  note: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
};

async function ensureShareLinksTable(db: ReturnType<typeof drizzle>) {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS share_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(120) NOT NULL UNIQUE,
        note TEXT,
        expiresAt TIMESTAMP NULL,
        revokedAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    return true;
  } catch (error) {
    console.warn("[ShareLinks] Failed to ensure DB table:", error);
    return false;
  }
}

async function withShareLinksDbFallback<T>(
  action: (db: ReturnType<typeof drizzle>) => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  const db = await getDb();
  if (!db) return await fallback();
  const ok = await ensureShareLinksTable(db);
  if (!ok) return await fallback();
  try {
    return await action(db);
  } catch (error) {
    const message = (error as any)?.cause?.sqlMessage ?? (error as any)?.message ?? "";
    if (message.includes("share_links") && message.includes("doesn't exist")) {
      const retryOk = await ensureShareLinksTable(db);
      if (retryOk) {
        try {
          return await action(db);
        } catch (retryError) {
          console.warn("[ShareLinks] DB error after retry, falling back:", retryError);
        }
      }
    } else {
      console.warn("[ShareLinks] DB error, falling back to file store:", error);
    }
    return await fallback();
  }
}

export async function createShareLinkRecord(data: InsertShareLink): Promise<ShareLinkRecord | null> {
  return await withShareLinksDbFallback(
    async (db) => {
      const existing = await db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.code, data.code))
        .limit(1);
      if (existing.length) return null;
      await db.insert(shareLinks).values(data);
      const result = await db
        .select()
        .from(shareLinks)
        .where(eq(shareLinks.code, data.code))
        .limit(1);
      return result.length ? result[0] : null;
    },
    () => createLocalShareLink(data)
  );
}

export async function getShareLinkByCode(code: string): Promise<ShareLinkRecord | null> {
  return await withShareLinksDbFallback(
    async (db) => {
      const result = await db.select().from(shareLinks).where(eq(shareLinks.code, code)).limit(1);
      return result.length ? result[0] : null;
    },
    () => getLocalShareLinkByCode(code)
  );
}

export async function listShareLinks(): Promise<ShareLinkRecord[]> {
  return await withShareLinksDbFallback(
    (db) => db.select().from(shareLinks).orderBy(desc(shareLinks.createdAt)),
    () => listLocalShareLinks()
  );
}

export async function revokeShareLink(code: string) {
  return await withShareLinksDbFallback(
    async (db) => {
      const now = new Date();
      await db.update(shareLinks).set({ revokedAt: now }).where(eq(shareLinks.code, code));
      return true;
    },
    () => revokeLocalShareLink(code)
  );
}

export async function extendShareLink(code: string, hours: number): Promise<ShareLinkRecord | null> {
  const record = await getShareLinkByCode(code);
  if (!record) return null;
  if (!record.expiresAt) return null;
  const now = new Date();
  const base = record.expiresAt && record.expiresAt.getTime() > now.getTime()
    ? record.expiresAt
    : now;
  const newExpiresAt = new Date(base.getTime() + hours * 60 * 60 * 1000);

  return await withShareLinksDbFallback(
    async (db) => {
      await db.update(shareLinks).set({ expiresAt: newExpiresAt }).where(eq(shareLinks.code, code));
      return {
        ...record,
        expiresAt: newExpiresAt,
      };
    },
    () => extendLocalShareLink(code, newExpiresAt)
  );
}

// ============================================
// Portfolio Images Functions
// ============================================

export async function getAllPortfolioImages() {
  if (useFileStore) return await listFilePortfolioImages();
  const db = await getDb();
  if (!db) return await listFilePortfolioImages();
  try {
    return await db.select().from(portfolioImages).orderBy(asc(portfolioImages.sortOrder));
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load portfolio images, falling back to file store:", error);
    return await listFilePortfolioImages();
  }
}

export async function getPortfolioImageById(id: number) {
  if (useFileStore) return await getFilePortfolioImageById(id);
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(portfolioImages).where(eq(portfolioImages.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load portfolio image, falling back to file store:", error);
    return await getFilePortfolioImageById(id);
  }
}

export async function createPortfolioImage(data: InsertPortfolioImage & Positionable) {
  if (useFileStore) return await createFilePortfolioImage(data);
  const db = await getDb();
  if (!db) return null;

  try {
    const dbData = stripPositionFields(data);
    const result = await db.insert(portfolioImages).values(dbData);
    const insertId = result[0].insertId;
    return await getPortfolioImageById(insertId);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to create portfolio image, falling back to file store:", error);
    return await createFilePortfolioImage(data);
  }
}

export async function updatePortfolioImage(
  id: number,
  data: Partial<InsertPortfolioImage> & Positionable
) {
  if (useFileStore) return await updateFilePortfolioImage(id, data);
  const db = await getDb();
  if (!db) return null;

  try {
    const dbData = stripPositionFields(data);
    await db.update(portfolioImages).set(dbData).where(eq(portfolioImages.id, id));
    return await getPortfolioImageById(id);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to update portfolio image, falling back to file store:", error);
    return await updateFilePortfolioImage(id, data);
  }
}

export async function deletePortfolioImage(id: number) {
  if (useFileStore) return await deleteFilePortfolioImage(id);
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(portfolioImages).where(eq(portfolioImages.id, id));
    return true;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to delete portfolio image, falling back to file store:", error);
    return await deleteFilePortfolioImage(id);
  }
}

// ============================================
// Site Sections Functions
// ============================================

export async function getAllSiteSections() {
  if (useFileStore) return await listFileSiteSections();
  const db = await getDb();
  if (!db) return await listFileSiteSections();
  try {
    return await db.select().from(siteSections).orderBy(asc(siteSections.sortOrder));
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load site sections, falling back to file store:", error);
    return await listFileSiteSections();
  }
}

export async function getSiteSectionByKey(key: string) {
  if (useFileStore) return await getFileSiteSectionByKey(key);
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(siteSections).where(eq(siteSections.key, key)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load site section, falling back to file store:", error);
    return await getFileSiteSectionByKey(key);
  }
}

export async function upsertSiteSection(data: InsertSiteSection) {
  if (useFileStore) return await upsertFileSiteSection(data);
  const db = await getDb();
  if (!db) return null;
  
  try {
    await db.insert(siteSections).values(data).onDuplicateKeyUpdate({
      set: { name: data.name, visible: data.visible, sortOrder: data.sortOrder, page: data.page },
    });
    return await getSiteSectionByKey(data.key);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to upsert site section, falling back to file store:", error);
    return await upsertFileSiteSection(data);
  }
}

export async function updateSiteSectionVisibility(key: string, visible: boolean) {
  if (useFileStore) return await updateFileSiteSectionVisibility(key, visible);
  const db = await getDb();
  if (!db) return null;
  
  try {
    await db.update(siteSections).set({ visible }).where(eq(siteSections.key, key));
    return await getSiteSectionByKey(key);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to update site section, falling back to file store:", error);
    return await updateFileSiteSectionVisibility(key, visible);
  }
}

// ============================================
// Packages Functions
// ============================================

export async function getAllPackages() {
  if (useFileStore) return await listFilePackages();
  const db = await getDb();
  if (!db) return await listFilePackages();
  try {
    const rows = await db.select().from(packages).orderBy(asc(packages.sortOrder));
    const legacyMatchers = [/سيشن\+مطبوعات/i, /جلسات\s*التصوير\s*\+\s*المطبوعات/i];
    const isLegacy = (name?: string | null) =>
      !!name && legacyMatchers.some((re) => re.test(name));
    const legacyRows = rows.filter((row) => isLegacy(row.name));
    if (legacyRows.length) {
      for (const row of legacyRows) {
        await db.delete(packages).where(eq(packages.id, row.id));
      }
    }
    const hasCustomPackage = rows.some(
      (row) =>
        row.category === "prints" &&
        typeof row.name === "string" &&
        row.name.includes("خصص")
    );
    if (!hasCustomPackage) {
      const filePackages = await listFilePackages();
      const custom = filePackages.find(
        (pkg) =>
          pkg.category === "prints" &&
          typeof pkg.name === "string" &&
          pkg.name.includes("خصص")
      );
      if (custom) {
        await db.insert(packages).values({
          name: custom.name,
          price: custom.price,
          description: custom.description ?? null,
          features: custom.features ?? null,
          category: custom.category,
          popular: custom.popular ?? false,
          visible: custom.visible ?? true,
          sortOrder: custom.sortOrder ?? 0,
        });
      }
    }
    if (rows.length === 0 && !packagesSeeded) {
      packagesSeeded = true;
      const filePackages = await listFilePackages();
      if (filePackages.length) {
        for (const pkg of filePackages) {
          await db.insert(packages).values({
            name: pkg.name,
            price: pkg.price,
            description: pkg.description ?? null,
            features: pkg.features ?? null,
            category: pkg.category,
            popular: pkg.popular ?? false,
            visible: pkg.visible ?? true,
            sortOrder: pkg.sortOrder ?? 0,
          });
        }
        return await db.select().from(packages).orderBy(asc(packages.sortOrder));
      }
    }
    return legacyRows.length
      ? await db.select().from(packages).orderBy(asc(packages.sortOrder))
      : rows;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load packages, falling back to file store:", error);
    return await listFilePackages();
  }
}

export async function getPackageById(id: number) {
  if (useFileStore) return await getFilePackageById(id);
  const db = await getDb();
  if (!db) return await getFilePackageById(id);
  try {
    const result = await db.select().from(packages).where(eq(packages.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load package, falling back to file store:", error);
    return await getFilePackageById(id);
  }
}

export async function createPackage(data: InsertPackage & Positionable) {
  if (useFileStore) return await createFilePackage(data);
  const db = await getDb();
  if (!db) return await createFilePackage(data);

  try {
    const dbData = stripPositionFields(data);
    const result = await db.insert(packages).values(dbData);
    const insertId = result[0].insertId;
    const created = await getPackageById(insertId);
    if (created) {
      await recordPackageHistory("create", created);
    }
    return created;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to create package, falling back to file store:", error);
    return await createFilePackage(data);
  }
}

export async function updatePackage(
  id: number,
  data: Partial<InsertPackage> & Positionable
) {
  if (useFileStore) return await updateFilePackage(id, data);
  const db = await getDb();
  if (!db) return await updateFilePackage(id, data);

  try {
    const dbData = stripPositionFields(data);
    await db.update(packages).set(dbData).where(eq(packages.id, id));
    const updated = await getPackageById(id);
    if (updated) {
      await recordPackageHistory("update", updated);
    }
    return updated;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to update package, falling back to file store:", error);
    return await updateFilePackage(id, data);
  }
}

export async function deletePackage(id: number) {
  if (useFileStore) return await deleteFilePackage(id);
  const db = await getDb();
  if (!db) return await deleteFilePackage(id);
  try {
    const snapshot = await getPackageById(id);
    await db.delete(packages).where(eq(packages.id, id));
    if (snapshot) {
      await recordPackageHistory("delete", snapshot);
    }
    return true;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to delete package, falling back to file store:", error);
    return await deleteFilePackage(id);
  }
}

// ============================================
// Testimonials Functions
// ============================================

export async function getAllTestimonials() {
  if (useFileStore) return await listFileTestimonials();
  const db = await getDb();
  if (!db) return await listFileTestimonials();
  try {
    return await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder));
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load testimonials, falling back to file store:", error);
    return await listFileTestimonials();
  }
}

export async function getTestimonialById(id: number) {
  if (useFileStore) return await getFileTestimonialById(id);
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load testimonial, falling back to file store:", error);
    return await getFileTestimonialById(id);
  }
}

export async function createTestimonial(data: InsertTestimonial & Positionable) {
  if (useFileStore) return await createFileTestimonial(data);
  const db = await getDb();
  if (!db) return null;

  try {
    const dbData = stripPositionFields(data);
    const result = await db.insert(testimonials).values(dbData);
    const insertId = result[0].insertId;
    return await getTestimonialById(insertId);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to create testimonial, falling back to file store:", error);
    return await createFileTestimonial(data);
  }
}

export async function updateTestimonial(
  id: number,
  data: Partial<InsertTestimonial> & Positionable
) {
  if (useFileStore) return await updateFileTestimonial(id, data);
  const db = await getDb();
  if (!db) return null;

  try {
    const dbData = stripPositionFields(data);
    await db.update(testimonials).set(dbData).where(eq(testimonials.id, id));
    return await getTestimonialById(id);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to update testimonial, falling back to file store:", error);
    return await updateFileTestimonial(id, data);
  }
}

export async function deleteTestimonial(id: number) {
  if (useFileStore) return await deleteFileTestimonial(id);
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(testimonials).where(eq(testimonials.id, id));
    return true;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to delete testimonial, falling back to file store:", error);
    return await deleteFileTestimonial(id);
  }
}

// ============================================
// FAQs Functions
// ============================================

export async function getAllFaqs() {
  if (useFileStore) return await listFileFaqs();
  const db = await getDb();
  if (!db) return await listFileFaqs();
  try {
    return await db.select().from(faqs).orderBy(asc(faqs.sortOrder));
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load faqs, falling back to file store:", error);
    return await listFileFaqs();
  }
}

export async function getFaqById(id: number) {
  if (useFileStore) return await getFileFaqById(id);
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(faqs).where(eq(faqs.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load faq, falling back to file store:", error);
    return await getFileFaqById(id);
  }
}

export async function createFaq(data: InsertFaq) {
  if (useFileStore) return await createFileFaq(data);
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(faqs).values(data);
    const insertId = result[0].insertId;
    return await getFaqById(insertId);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to create faq, falling back to file store:", error);
    return await createFileFaq(data);
  }
}

export async function updateFaq(id: number, data: Partial<InsertFaq>) {
  if (useFileStore) return await updateFileFaq(id, data);
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(faqs).set(data).where(eq(faqs.id, id));
    return await getFaqById(id);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to update faq, falling back to file store:", error);
    return await updateFileFaq(id, data);
  }
}

export async function deleteFaq(id: number) {
  if (useFileStore) return await deleteFileFaq(id);
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(faqs).where(eq(faqs.id, id));
    return true;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to delete faq, falling back to file store:", error);
    return await deleteFileFaq(id);
  }
}

// ============================================
// Contact Info Functions
// ============================================

export async function getAllContactInfo() {
  if (useFileStore) return await listFileContactInfo();
  const db = await getDb();
  if (!db) return await listFileContactInfo();
  try {
    return await db.select().from(contactInfo);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load contact info, falling back to file store:", error);
    return await listFileContactInfo();
  }
}

export async function getContactInfoByKey(key: string) {
  if (useFileStore) return await getFileContactInfoByKey(key);
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(contactInfo).where(eq(contactInfo.key, key)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to load contact info item, falling back to file store:", error);
    return await getFileContactInfoByKey(key);
  }
}

export async function upsertContactInfo(data: InsertContactInfo) {
  if (useFileStore) return await upsertFileContactInfo(data);
  const db = await getDb();
  if (!db) return null;
  
  try {
    await db.insert(contactInfo).values(data).onDuplicateKeyUpdate({
      set: { value: data.value, label: data.label },
    });
    return await getContactInfoByKey(data.key);
  } catch (error) {
    flagDbDisabledForError(error);
    console.warn("[Database] Failed to upsert contact info, falling back to file store:", error);
    return await upsertFileContactInfo(data);
  }
}
