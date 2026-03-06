import fs from "fs/promises";
import path from "path";
import type { InsertSiteContent, SiteContent } from "../../drizzle/schema";
import { queueAdminGithubSync } from "./adminFileStore";

type SiteContentPosition = {
  offsetX?: number | null;
  offsetY?: number | null;
};

type LocalSiteContent = SiteContent & SiteContentPosition;

type StoredSiteContent = Omit<LocalSiteContent, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

const storeFile =
  process.env.SITE_CONTENT_FILE ??
  path.resolve(process.cwd(), "data", "admin", "site-content.json");

let store: Map<string, LocalSiteContent> | null = null;
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
      const parsed = JSON.parse(raw) as StoredSiteContent[];
      store = new Map(
        parsed.map((item) => [
          item.key,
          {
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
          },
        ])
      );
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.warn("[SiteContent] Failed to load fallback store:", error);
      }
      store = new Map();
    }
  })();
  await loading;
  loading = null;
}

async function persistStore() {
  if (!store) return;
  const dir = path.dirname(storeFile);
  await fs.mkdir(dir, { recursive: true });
  const data: StoredSiteContent[] = Array.from(store.values()).map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(storeFile, content, "utf8");
  queueAdminGithubSync(path.basename(storeFile), content);
}

function nextId() {
  return Math.floor(Date.now() + Math.random() * 1000);
}

export async function listLocalSiteContent(): Promise<LocalSiteContent[]> {
  await ensureStoreLoaded();
  return Array.from(store?.values() ?? []).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

export async function getLocalSiteContentByKey(
  key: string
): Promise<LocalSiteContent | null> {
  await ensureStoreLoaded();
  return store?.get(key) ?? null;
}

export async function upsertLocalSiteContent(
  data: InsertSiteContent & SiteContentPosition
): Promise<LocalSiteContent> {
  await ensureStoreLoaded();
  const existing = store?.get(data.key);
  const now = new Date();
  const record: LocalSiteContent = {
    id: existing?.id ?? nextId(),
    key: data.key,
    value: data.value,
    category: data.category,
    label: data.label ?? existing?.label ?? null,
    offsetX: data.offsetX ?? existing?.offsetX ?? null,
    offsetY: data.offsetY ?? existing?.offsetY ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  store?.set(data.key, record);
  await persistStore();
  return record;
}

export async function deleteLocalSiteContent(key: string) {
  await ensureStoreLoaded();
  const existed = store?.delete(key) ?? false;
  if (existed) {
    await persistStore();
  }
  return existed;
}
