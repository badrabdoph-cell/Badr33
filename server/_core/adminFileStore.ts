import fs from "fs/promises";
import path from "path";
import type {
  ContactInfo,
  InsertContactInfo,
  InsertFaq,
  InsertPackage,
  InsertPortfolioImage,
  InsertSiteImage,
  InsertSiteSection,
  InsertTestimonial,
  Faq,
  Package,
  PortfolioImage,
  SiteImage,
  SiteSection,
  Testimonial,
} from "../../drizzle/schema";

const baseDir =
  process.env.ADMIN_FILE_STORE_DIR ?? path.resolve(process.cwd(), "data", "admin");

const githubToken =
  process.env.ADMIN_GITHUB_TOKEN ??
  process.env.GITHUB_TOKEN ??
  process.env.GH_TOKEN ??
  "";
const githubRepo =
  process.env.ADMIN_GITHUB_REPO ??
  (process.env.RAILWAY_GIT_REPO_OWNER && process.env.RAILWAY_GIT_REPO_NAME
    ? `${process.env.RAILWAY_GIT_REPO_OWNER}/${process.env.RAILWAY_GIT_REPO_NAME}`
    : "") ??
  "";
const githubBranch = process.env.ADMIN_GITHUB_BRANCH ?? "main";
const githubPath = process.env.ADMIN_GITHUB_PATH ?? "data/admin";
const githubEnabled =
  (process.env.ADMIN_GITHUB_SYNC ??
    (githubToken && githubRepo ? "true" : "false")) === "true";

const FILES = {
  siteImages: "site-images.json",
  portfolioImages: "portfolio-images.json",
  siteSections: "site-sections.json",
  packages: "packages.json",
  packagesHistory: "packages-history.json",
  testimonials: "testimonials.json",
  faqs: "faqs.json",
  contactInfo: "contact-info.json",
} as const;

type Positionable = {
  offsetX?: number | null;
  offsetY?: number | null;
};

type PositionedSiteImage = SiteImage & Positionable;
type PositionedPortfolioImage = PortfolioImage & Positionable;
type PositionedPackage = Package & Positionable;
type PositionedTestimonial = Testimonial & Positionable;
type PositionedFaq = Faq;

export type PackageHistoryEntry = {
  id: number;
  packageId: number;
  action: "create" | "update" | "delete" | "restore" | "snapshot";
  snapshot: PositionedPackage;
  createdAt: Date;
};

type DateField = "createdAt" | "updatedAt" | "expiresAt" | "revokedAt";
const DATE_FIELDS: DateField[] = ["createdAt", "updatedAt", "expiresAt", "revokedAt"];

function reviveDates<T extends Record<string, any>>(item: T): T {
  const out = { ...item };
  for (const key of DATE_FIELDS) {
    const value = out[key];
    if (typeof value === "string") {
      out[key] = new Date(value);
    }
  }
  return out;
}

function serialize(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) => (item instanceof Date ? item.toISOString() : item),
    2
  );
}

type PendingFile = { name: string; content: string };
const pendingFiles = new Map<string, string>();
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function githubPathFor(name: string) {
  const base = githubPath.replace(/\/+$/, "");
  return `${base}/${name}`;
}

async function githubRequest<T>(
  pathName: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`https://api.github.com${pathName}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      authorization: `Bearer ${githubToken}`,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `GitHub API error (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }
  return (await response.json()) as T;
}

async function flushGithubSync(files: PendingFile[]) {
  if (!githubEnabled || !githubToken || !githubRepo) return;

  type RefResponse = { object: { sha: string } };
  type CommitResponse = { sha: string; tree: { sha: string } };
  type BlobResponse = { sha: string };
  type TreeResponse = { sha: string };

  const ref = await githubRequest<RefResponse>(
    `/repos/${githubRepo}/git/ref/heads/${githubBranch}`
  );
  const baseCommit = await githubRequest<CommitResponse>(
    `/repos/${githubRepo}/git/commits/${ref.object.sha}`
  );

  const treeItems = [];
  for (const file of files) {
    const blob = await githubRequest<BlobResponse>(
      `/repos/${githubRepo}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({
          content: file.content,
          encoding: "utf-8",
        }),
      }
    );
    treeItems.push({
      path: githubPathFor(file.name),
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  const tree = await githubRequest<TreeResponse>(
    `/repos/${githubRepo}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseCommit.tree.sha,
        tree: treeItems,
      }),
    }
  );

  const timestamp = new Date().toISOString();
  const commit = await githubRequest<CommitResponse>(
    `/repos/${githubRepo}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message: `chore(admin): update content ${timestamp}`,
        tree: tree.sha,
        parents: [baseCommit.sha],
      }),
    }
  );

  await githubRequest(
    `/repos/${githubRepo}/git/refs/heads/${githubBranch}`,
    {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    }
  );
}

export function queueAdminGithubSync(filename: string, content: string) {
  if (!githubEnabled) return;
  pendingFiles.set(filename, content);
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    const files = Array.from(pendingFiles.entries()).map(([name, fileContent]) => ({
      name,
      content: fileContent,
    }));
    pendingFiles.clear();
    try {
      await flushGithubSync(files);
    } catch (error) {
      console.warn("[AdminFileStore] GitHub sync failed:", error);
    }
  }, 800);
}

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(baseDir, filename), "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(reviveDates) as T;
    }
    return reviveDates(parsed) as T;
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.warn("[AdminFileStore] Failed to read file:", error);
    }
    return fallback;
  }
}

async function writeJson(filename: string, data: unknown) {
  await fs.mkdir(baseDir, { recursive: true });
  const content = serialize(data);
  await fs.writeFile(path.join(baseDir, filename), content, "utf8");
  queueAdminGithubSync(filename, content);
}

function nextId(items: Array<{ id?: number | null }>) {
  const max = items.reduce((acc, item) => {
    const value = typeof item.id === "number" ? item.id : 0;
    return value > acc ? value : acc;
  }, 0);
  return max + 1;
}

// Site Images
export async function listFileSiteImages(): Promise<PositionedSiteImage[]> {
  const data = await readJson<PositionedSiteImage[]>(FILES.siteImages, []);
  return data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getFileSiteImageByKey(
  key: string
): Promise<PositionedSiteImage | null> {
  const data = await listFileSiteImages();
  return data.find((item) => item.key === key) ?? null;
}

export async function upsertFileSiteImage(
  data: InsertSiteImage & Positionable
): Promise<PositionedSiteImage> {
  const list = await readJson<PositionedSiteImage[]>(FILES.siteImages, []);
  const now = new Date();
  const existingIndex = list.findIndex((item) => item.key === data.key);
  if (existingIndex >= 0) {
    const existing = list[existingIndex];
    const updated: PositionedSiteImage = {
      ...existing,
      url: data.url,
      alt: data.alt ?? existing.alt ?? null,
      category: data.category,
      sortOrder: data.sortOrder ?? existing.sortOrder ?? 0,
      offsetX: data.offsetX ?? existing.offsetX ?? null,
      offsetY: data.offsetY ?? existing.offsetY ?? null,
      updatedAt: now,
    };
    list[existingIndex] = updated;
    await writeJson(FILES.siteImages, list);
    return updated;
  }
  const record: PositionedSiteImage = {
    id: nextId(list),
    key: data.key,
    url: data.url,
    alt: data.alt ?? null,
    category: data.category,
    sortOrder: data.sortOrder ?? 0,
    offsetX: data.offsetX ?? null,
    offsetY: data.offsetY ?? null,
    createdAt: now,
    updatedAt: now,
  } as PositionedSiteImage;
  list.push(record);
  await writeJson(FILES.siteImages, list);
  return record;
}

export async function deleteFileSiteImage(key: string) {
  const list = await readJson<PositionedSiteImage[]>(FILES.siteImages, []);
  const next = list.filter((item) => item.key !== key);
  const existed = next.length !== list.length;
  if (existed) {
    await writeJson(FILES.siteImages, next);
  }
  return existed;
}

// Portfolio Images
export async function listFilePortfolioImages(): Promise<PositionedPortfolioImage[]> {
  const data = await readJson<PositionedPortfolioImage[]>(FILES.portfolioImages, []);
  return data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getFilePortfolioImageById(
  id: number
): Promise<PositionedPortfolioImage | null> {
  const data = await listFilePortfolioImages();
  return data.find((item) => item.id === id) ?? null;
}

export async function createFilePortfolioImage(
  data: InsertPortfolioImage & Positionable
): Promise<PositionedPortfolioImage> {
  const list = await readJson<PositionedPortfolioImage[]>(FILES.portfolioImages, []);
  const now = new Date();
  const record: PositionedPortfolioImage = {
    id: nextId(list),
    title: data.title,
    url: data.url,
    category: data.category,
    visible: data.visible ?? true,
    sortOrder: data.sortOrder ?? 0,
    offsetX: data.offsetX ?? null,
    offsetY: data.offsetY ?? null,
    createdAt: now,
    updatedAt: now,
  } as PositionedPortfolioImage;
  list.push(record);
  await writeJson(FILES.portfolioImages, list);
  return record;
}

export async function updateFilePortfolioImage(
  id: number,
  data: Partial<InsertPortfolioImage> & Positionable
): Promise<PositionedPortfolioImage | null> {
  const list = await readJson<PositionedPortfolioImage[]>(FILES.portfolioImages, []);
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const existing = list[index];
  const updated: PositionedPortfolioImage = {
    ...existing,
    ...data,
    updatedAt: new Date(),
  } as PositionedPortfolioImage;
  list[index] = updated;
  await writeJson(FILES.portfolioImages, list);
  return updated;
}

export async function deleteFilePortfolioImage(id: number) {
  const list = await readJson<PositionedPortfolioImage[]>(FILES.portfolioImages, []);
  const next = list.filter((item) => item.id !== id);
  const existed = next.length !== list.length;
  if (existed) {
    await writeJson(FILES.portfolioImages, next);
  }
  return existed;
}

// Site Sections
export async function listFileSiteSections(): Promise<SiteSection[]> {
  const data = await readJson<SiteSection[]>(FILES.siteSections, []);
  return data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getFileSiteSectionByKey(
  key: string
): Promise<SiteSection | null> {
  const data = await listFileSiteSections();
  return data.find((item) => item.key === key) ?? null;
}

export async function upsertFileSiteSection(
  data: InsertSiteSection
): Promise<SiteSection> {
  const list = await readJson<SiteSection[]>(FILES.siteSections, []);
  const now = new Date();
  const index = list.findIndex((item) => item.key === data.key);
  if (index >= 0) {
    const existing = list[index];
    const updated: SiteSection = {
      ...existing,
      name: data.name,
      visible: data.visible,
      sortOrder: data.sortOrder ?? existing.sortOrder ?? 0,
      page: data.page,
      updatedAt: now,
    } as SiteSection;
    list[index] = updated;
    await writeJson(FILES.siteSections, list);
    return updated;
  }
  const record: SiteSection = {
    id: nextId(list),
    key: data.key,
    name: data.name,
    visible: data.visible,
    sortOrder: data.sortOrder ?? 0,
    page: data.page,
    createdAt: now,
    updatedAt: now,
  } as SiteSection;
  list.push(record);
  await writeJson(FILES.siteSections, list);
  return record;
}

export async function updateFileSiteSectionVisibility(
  key: string,
  visible: boolean
): Promise<SiteSection | null> {
  const list = await readJson<SiteSection[]>(FILES.siteSections, []);
  const index = list.findIndex((item) => item.key === key);
  if (index === -1) return null;
  const updated: SiteSection = {
    ...list[index],
    visible,
    updatedAt: new Date(),
  } as SiteSection;
  list[index] = updated;
  await writeJson(FILES.siteSections, list);
  return updated;
}

// Packages
export async function listFilePackages(): Promise<PositionedPackage[]> {
  const data = await readJson<PositionedPackage[]>(FILES.packages, []);
  return data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getFilePackageById(
  id: number
): Promise<PositionedPackage | null> {
  const data = await listFilePackages();
  return data.find((item) => item.id === id) ?? null;
}

export async function createFilePackage(
  data: InsertPackage & Positionable
): Promise<PositionedPackage> {
  const list = await readJson<PositionedPackage[]>(FILES.packages, []);
  const now = new Date();
  const record: PositionedPackage = {
    id: nextId(list),
    name: data.name,
    price: data.price,
    description: data.description ?? null,
    features: data.features ?? null,
    category: data.category,
    badge: (data as any).badge ?? null,
    priceNote: (data as any).priceNote ?? null,
    emoji: (data as any).emoji ?? null,
    featured: (data as any).featured ?? false,
    popular: data.popular ?? false,
    visible: data.visible ?? true,
    sortOrder: data.sortOrder ?? 0,
    offsetX: data.offsetX ?? null,
    offsetY: data.offsetY ?? null,
    createdAt: now,
    updatedAt: now,
  } as PositionedPackage;
  list.push(record);
  await writeJson(FILES.packages, list);
  await recordFilePackageHistory("create", record);
  return record;
}

export async function updateFilePackage(
  id: number,
  data: Partial<InsertPackage> & Positionable
): Promise<PositionedPackage | null> {
  const list = await readJson<PositionedPackage[]>(FILES.packages, []);
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const updated: PositionedPackage = {
    ...list[index],
    ...data,
    updatedAt: new Date(),
  } as PositionedPackage;
  list[index] = updated;
  await writeJson(FILES.packages, list);
  await recordFilePackageHistory("update", updated);
  return updated;
}

export async function deleteFilePackage(id: number) {
  const list = await readJson<PositionedPackage[]>(FILES.packages, []);
  const target = list.find((item) => item.id === id);
  if (target) {
    await recordFilePackageHistory("delete", target);
  }
  const next = list.filter((item) => item.id !== id);
  const existed = next.length !== list.length;
  if (existed) {
    await writeJson(FILES.packages, next);
  }
  return existed;
}

// Packages History
export async function listFilePackageHistory(): Promise<PackageHistoryEntry[]> {
  const data = await readJson<PackageHistoryEntry[]>(FILES.packagesHistory, []);
  return data.sort((a, b) => {
    const aTime = new Date(a.createdAt as any).getTime();
    const bTime = new Date(b.createdAt as any).getTime();
    return bTime - aTime;
  });
}

export async function clearFilePackageHistory(): Promise<boolean> {
  await writeJson(FILES.packagesHistory, []);
  return true;
}

export async function recordFilePackageHistory(
  action: PackageHistoryEntry["action"],
  snapshot: PositionedPackage
): Promise<PackageHistoryEntry> {
  const list = await readJson<PackageHistoryEntry[]>(FILES.packagesHistory, []);
  const entry: PackageHistoryEntry = {
    id: Date.now(),
    packageId: snapshot.id,
    action,
    snapshot,
    createdAt: new Date(),
  };
  list.push(entry);
  await writeJson(FILES.packagesHistory, list);
  return entry;
}

export async function restoreFilePackage(
  snapshot: PositionedPackage,
  action: PackageHistoryEntry["action"] = "restore"
): Promise<PositionedPackage> {
  const list = await readJson<PositionedPackage[]>(FILES.packages, []);
  const index = list.findIndex((item) => item.id === snapshot.id);
  const now = new Date();
  const record: PositionedPackage = {
    ...snapshot,
    createdAt: snapshot.createdAt ?? now,
    updatedAt: now,
  } as PositionedPackage;
  if (index === -1) {
    list.push(record);
  } else {
    list[index] = record;
  }
  await writeJson(FILES.packages, list);
  await recordFilePackageHistory(action, record);
  return record;
}

// Testimonials
export async function listFileTestimonials(): Promise<PositionedTestimonial[]> {
  const data = await readJson<PositionedTestimonial[]>(FILES.testimonials, []);
  return data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getFileTestimonialById(
  id: number
): Promise<PositionedTestimonial | null> {
  const data = await listFileTestimonials();
  return data.find((item) => item.id === id) ?? null;
}

export async function createFileTestimonial(
  data: InsertTestimonial & Positionable
): Promise<PositionedTestimonial> {
  const list = await readJson<PositionedTestimonial[]>(FILES.testimonials, []);
  const now = new Date();
  const record: PositionedTestimonial = {
    id: nextId(list),
    name: data.name,
    quote: data.quote,
    visible: data.visible ?? true,
    sortOrder: data.sortOrder ?? 0,
    offsetX: data.offsetX ?? null,
    offsetY: data.offsetY ?? null,
    createdAt: now,
    updatedAt: now,
  } as PositionedTestimonial;
  list.push(record);
  await writeJson(FILES.testimonials, list);
  return record;
}

export async function updateFileTestimonial(
  id: number,
  data: Partial<InsertTestimonial> & Positionable
): Promise<PositionedTestimonial | null> {
  const list = await readJson<PositionedTestimonial[]>(FILES.testimonials, []);
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const updated: PositionedTestimonial = {
    ...list[index],
    ...data,
    updatedAt: new Date(),
  } as PositionedTestimonial;
  list[index] = updated;
  await writeJson(FILES.testimonials, list);
  return updated;
}

export async function deleteFileTestimonial(id: number) {
  const list = await readJson<PositionedTestimonial[]>(FILES.testimonials, []);
  const next = list.filter((item) => item.id !== id);
  const existed = next.length !== list.length;
  if (existed) {
    await writeJson(FILES.testimonials, next);
  }
  return existed;
}

// FAQs
export async function listFileFaqs(): Promise<PositionedFaq[]> {
  const data = await readJson<PositionedFaq[]>(FILES.faqs, []);
  return data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getFileFaqById(id: number): Promise<PositionedFaq | null> {
  const data = await listFileFaqs();
  return data.find((item) => item.id === id) ?? null;
}

export async function createFileFaq(data: InsertFaq): Promise<PositionedFaq> {
  const list = await readJson<PositionedFaq[]>(FILES.faqs, []);
  const now = new Date();
  const record: PositionedFaq = {
    id: nextId(list),
    question: data.question,
    answer: data.answer,
    visible: data.visible ?? true,
    sortOrder: data.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  } as PositionedFaq;
  list.push(record);
  await writeJson(FILES.faqs, list);
  return record;
}

export async function updateFileFaq(
  id: number,
  data: Partial<InsertFaq>
): Promise<PositionedFaq | null> {
  const list = await readJson<PositionedFaq[]>(FILES.faqs, []);
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const updated: PositionedFaq = {
    ...list[index],
    ...data,
    updatedAt: new Date(),
  } as PositionedFaq;
  list[index] = updated;
  await writeJson(FILES.faqs, list);
  return updated;
}

export async function deleteFileFaq(id: number) {
  const list = await readJson<PositionedFaq[]>(FILES.faqs, []);
  const next = list.filter((item) => item.id !== id);
  const existed = next.length !== list.length;
  if (existed) {
    await writeJson(FILES.faqs, next);
  }
  return existed;
}

// Contact Info
export async function listFileContactInfo(): Promise<ContactInfo[]> {
  return await readJson<ContactInfo[]>(FILES.contactInfo, []);
}

export async function getFileContactInfoByKey(
  key: string
): Promise<ContactInfo | null> {
  const data = await listFileContactInfo();
  return data.find((item) => item.key === key) ?? null;
}

export async function upsertFileContactInfo(
  data: InsertContactInfo
): Promise<ContactInfo> {
  const list = await readJson<ContactInfo[]>(FILES.contactInfo, []);
  const now = new Date();
  const index = list.findIndex((item) => item.key === data.key);
  if (index >= 0) {
    const existing = list[index];
    const updated: ContactInfo = {
      ...existing,
      value: data.value,
      label: data.label ?? existing.label ?? null,
      updatedAt: now,
    } as ContactInfo;
    list[index] = updated;
    await writeJson(FILES.contactInfo, list);
    return updated;
  }
  const record: ContactInfo = {
    id: nextId(list),
    key: data.key,
    value: data.value,
    label: data.label ?? null,
    createdAt: now,
    updatedAt: now,
  } as ContactInfo;
  list.push(record);
  await writeJson(FILES.contactInfo, list);
  return record;
}
