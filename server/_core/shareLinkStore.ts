import fs from "fs/promises";
import path from "path";
import type { InsertShareLink } from "../../drizzle/schema";
import { queueAdminGithubSync } from "./adminFileStore";

type LocalShareLink = {
  id: number;
  code: string;
  note: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
};

type StoredShareLink = {
  id: number;
  code: string;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
};

const storeFile =
  process.env.SHARE_LINKS_FILE ??
  path.resolve(process.cwd(), "data", "admin", "share-links.json");
const legacyStoreFile = path.resolve(process.cwd(), "data", "share-links.json");

let store: Map<string, LocalShareLink> | null = null;
let loading: Promise<void> | null = null;

async function ensureStoreLoaded() {
  if (store) return;
  if (loading) {
    await loading;
    return;
  }
  loading = (async () => {
    try {
      const raw = await fs.readFile(storeFile, "utf8");
      const parsed = JSON.parse(raw) as StoredShareLink[];
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
            revokedAt: item.revokedAt ? new Date(item.revokedAt) : null,
          },
        ])
      );
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.warn("[ShareLinks] Failed to load store:", error);
        store = new Map();
        return;
      }

      // Try legacy path once for migration
      try {
        const legacyRaw = await fs.readFile(legacyStoreFile, "utf8");
        const legacyParsed = JSON.parse(legacyRaw) as StoredShareLink[];
        store = new Map(
          legacyParsed.map((item) => [
            item.code,
            {
              id: item.id,
              code: item.code,
              note: item.note ?? null,
              expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
              revokedAt: item.revokedAt ? new Date(item.revokedAt) : null,
            },
          ])
        );
        await persistStore();
      } catch (legacyError: any) {
        if (legacyError?.code !== "ENOENT") {
          console.warn("[ShareLinks] Failed to load legacy store:", legacyError);
        }
        store = new Map();
      }
    }
  })();
  await loading;
  loading = null;
}

async function persistStore() {
  if (!store) return;
  const dir = path.dirname(storeFile);
  await fs.mkdir(dir, { recursive: true });
  const data: StoredShareLink[] = Array.from(store.values()).map((item) => ({
    id: item.id,
    code: item.code,
    note: item.note ?? null,
    expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    revokedAt: item.revokedAt ? item.revokedAt.toISOString() : null,
  }));
  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(storeFile, serialized, "utf8");
  queueAdminGithubSync("share-links.json", serialized);
}

function nextId() {
  return Math.floor(Date.now() + Math.random() * 1000);
}

export async function createLocalShareLink(
  data: InsertShareLink
): Promise<LocalShareLink | null> {
  await ensureStoreLoaded();
  const existing = store?.get(data.code ?? "");
  if (existing) return null;
  const now = new Date();
  const record: LocalShareLink = {
    id: nextId(),
    code: data.code,
    note: data.note ?? null,
    expiresAt: data.expiresAt ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
    revokedAt: data.revokedAt ?? null,
  };
  store?.set(data.code, record);
  await persistStore();
  return record;
}

export async function getLocalShareLinkByCode(
  code: string
): Promise<LocalShareLink | null> {
  await ensureStoreLoaded();
  return store?.get(code) ?? null;
}

export async function listLocalShareLinks(): Promise<LocalShareLink[]> {
  await ensureStoreLoaded();
  return Array.from(store?.values() ?? []).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export async function revokeLocalShareLink(code: string) {
  await ensureStoreLoaded();
  const record = store?.get(code);
  if (!record) return false;
  const now = new Date();
  record.revokedAt = now;
  record.updatedAt = now;
  store?.set(code, record);
  await persistStore();
  return true;
}

export async function extendLocalShareLink(
  code: string,
  newExpiresAt: Date
): Promise<LocalShareLink | null> {
  await ensureStoreLoaded();
  const record = store?.get(code);
  if (!record) return null;
  record.expiresAt = newExpiresAt;
  record.updatedAt = new Date();
  store?.set(code, record);
  await persistStore();
  return record;
}
