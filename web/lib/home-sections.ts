// Cấu hình các khối trên trang chủ (admin chỉnh được). Lưu 1 document _id="home"
// trong collection "home_sections". Mỗi khối (tin-tuc/viec-lam/tim-do-roi/mua-ban)
// chọn chế độ hiển thị:
//   - latest : tự lấy item mới nhất
//   - random : lấy ngẫu nhiên ($sample)
//   - manual : admin chọn cụ thể theo slug
// Theo pattern repo: mongodb native driver, helper gói trong file này (giống lib/settings.ts).
import { getDb } from "@/lib/db";
import type { Collection, Document, Filter, Sort } from "mongodb";
import { articles, type ArticleDoc, toNewsCardArticle } from "@/lib/articles";
import { jobs, formatSalary, type JobDoc } from "@/lib/jobs";
import { lostFound, type LostFoundDoc } from "@/lib/lostfound";
import { classifieds, CONDITION_LABEL, type ClassifiedDoc } from "@/lib/classifieds";
import type { Article } from "@/lib/news";
import { formatDate } from "@/lib/datetime";

export type HomeSectionKey = "tin-tuc" | "viec-lam" | "tim-do-roi" | "mua-ban" | "marquee";
export type HomeSectionMode = "latest" | "random" | "manual";
export const HOME_SECTION_MODES: HomeSectionMode[] = ["latest", "random", "manual"];

export type HomeSectionConfig = {
  enabled: boolean;
  mode: HomeSectionMode;
  manualSlugs: string[];   // dùng khi mode = "manual" (giữ thứ tự admin chọn)
  limit: number;           // số item hiển thị
};
export type HomeSectionsConfig = Record<HomeSectionKey, HomeSectionConfig>;

// "marquee" = dải chạy "Cập nhật mới" dưới navbar (chỉ lấy tiêu đề từ Tin tức).
export const HOME_SECTION_KEYS: HomeSectionKey[] = ["tin-tuc", "viec-lam", "tim-do-roi", "mua-ban", "marquee"];
export const HOME_SECTION_LABEL: Record<HomeSectionKey, string> = {
  "tin-tuc": "Tin tức",
  "viec-lam": "Việc làm",
  "tim-do-roi": "Tìm đồ rơi",
  "mua-ban": "Mua bán",
  "marquee": "Dải chạy (Marquee)",
};

const DEFAULT_LIMIT: Record<HomeSectionKey, number> = { "tin-tuc": 4, "viec-lam": 3, "tim-do-roi": 4, "mua-ban": 4, "marquee": 8 };
const MAX_LIMIT = 12;
const MAX_MANUAL = 24;

function defaults(): HomeSectionsConfig {
  return {
    "tin-tuc": { enabled: true, mode: "latest", manualSlugs: [], limit: DEFAULT_LIMIT["tin-tuc"] },
    "viec-lam": { enabled: true, mode: "latest", manualSlugs: [], limit: DEFAULT_LIMIT["viec-lam"] },
    "tim-do-roi": { enabled: true, mode: "latest", manualSlugs: [], limit: DEFAULT_LIMIT["tim-do-roi"] },
    "mua-ban": { enabled: true, mode: "latest", manualSlugs: [], limit: DEFAULT_LIMIT["mua-ban"] },
    "marquee": { enabled: true, mode: "latest", manualSlugs: [], limit: DEFAULT_LIMIT["marquee"] },
  };
}

type HomeSectionsDoc = { _id: string; sections: Partial<HomeSectionsConfig> };

async function col() {
  const db = await getDb();
  return db.collection<HomeSectionsDoc>("home_sections");
}

export async function getHomeSections(): Promise<HomeSectionsConfig> {
  try {
    const doc = await (await col()).findOne({ _id: "home" });
    const saved = doc?.sections ?? {};
    const base = defaults();
    const out = {} as HomeSectionsConfig;
    for (const k of HOME_SECTION_KEYS) out[k] = { ...base[k], ...(saved[k] ?? {}) };
    return out;
  } catch {
    return defaults();
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Lưu cấu hình — validate/clamp từng khối, bỏ qua field lạ (giống updateSettings).
export async function setHomeSections(input: Partial<HomeSectionsConfig>): Promise<HomeSectionsConfig> {
  const cur = await getHomeSections();
  const next = {} as HomeSectionsConfig;
  for (const k of HOME_SECTION_KEYS) {
    const c = cur[k];
    const p: Partial<HomeSectionConfig> = input[k] ?? {};
    const mode: HomeSectionMode = HOME_SECTION_MODES.includes(p.mode as HomeSectionMode) ? (p.mode as HomeSectionMode) : c.mode;
    const rawLimit = Math.round(Number(p.limit ?? c.limit));
    const limit = clamp(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT[k], 1, MAX_LIMIT);
    const manualSlugs = Array.isArray(p.manualSlugs)
      ? Array.from(new Set(p.manualSlugs.map((s) => String(s).trim()).filter(Boolean))).slice(0, MAX_MANUAL)
      : c.manualSlugs;
    const enabled = typeof p.enabled === "boolean" ? p.enabled : c.enabled;
    next[k] = { enabled, mode, manualSlugs, limit };
  }
  await (await col()).updateOne({ _id: "home" }, { $set: { sections: next } }, { upsert: true });
  return next;
}

// ───────────────────────── Resolve item theo cấu hình ─────────────────────────

// Card chuẩn hoá để render module (jobs/lostfound/mua-ban) trên trang chủ.
export type HomeCard = {
  slug: string;
  href: string;
  title: string;
  image: string | null;
  badge: string;
  badgeTone: "" | "lost" | "found";
  excerpt: string;
  meta: string;
};

// Lấy docs theo mode cho 1 collection có field slug + createdAt + approved/active.
async function pickDocs<T extends Document & { slug: string; createdAt: Date }>(c: Collection<T>, base: Filter<T>, cfg: HomeSectionConfig): Promise<T[]> {
  if (cfg.mode === "manual") {
    if (cfg.manualSlugs.length === 0) return [];
    const docs = (await c.find({ ...base, slug: { $in: cfg.manualSlugs } } as Filter<T>).toArray()) as T[];
    const order = new Map(cfg.manualSlugs.map((s, i) => [s, i] as const));
    docs.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
    return docs.slice(0, cfg.limit);
  }
  if (cfg.mode === "random") {
    return c.aggregate<T>([{ $match: base }, { $sample: { size: cfg.limit } }]).toArray();
  }
  return (await c.find(base).sort({ createdAt: -1 } as Sort).limit(cfg.limit).toArray()) as T[];
}

// Tin tức: trả Article[] (dùng lại NewsCard). Sắp theo publishedAt cho mode latest.
async function resolveNews(cfg: HomeSectionConfig): Promise<Article[]> {
  const c = await articles();
  const base: Filter<ArticleDoc> = { status: "published" };
  let docs: ArticleDoc[];
  if (cfg.mode === "manual") {
    if (cfg.manualSlugs.length === 0) return [];
    const found = await c.find({ ...base, slug: { $in: cfg.manualSlugs } }).toArray();
    const order = new Map(cfg.manualSlugs.map((s, i) => [s, i] as const));
    found.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
    docs = found.slice(0, cfg.limit);
  } else if (cfg.mode === "random") {
    docs = await c.aggregate<ArticleDoc>([{ $match: base }, { $sample: { size: cfg.limit } }]).toArray();
  } else {
    docs = await c.find(base).sort({ publishedAt: -1 }).limit(cfg.limit).toArray();
  }
  return docs.map(toNewsCardArticle);
}

const jobCard = (d: JobDoc): HomeCard => ({
  slug: d.slug, href: `/viec-lam/${d.slug}`, title: d.title,
  image: d.images?.[0] ?? null, badge: d.industryLabel, badgeTone: "",
  excerpt: d.company, meta: formatSalary(d.salary),
});
const lostfoundCard = (d: LostFoundDoc): HomeCard => ({
  slug: d.slug, href: `/tim-do-roi/${d.slug}`, title: d.title,
  image: d.images?.[0] ?? null,
  badge: d.kind === "tim-do" ? "Bị mất" : "Nhặt được",
  badgeTone: d.kind === "tim-do" ? "lost" : "found",
  excerpt: d.categoryName, meta: formatDate(d.occurredAt ?? d.createdAt),
});
const classifiedCard = (d: ClassifiedDoc): HomeCard => ({
  slug: d.slug, href: `/mua-ban/${d.slug}`, title: d.title,
  image: d.images?.[0] ?? null, badge: d.categoryLabel, badgeTone: "",
  excerpt: d.priceText, meta: d.condition ? CONDITION_LABEL[d.condition] : formatDate(d.createdAt),
});

export type HomeSectionsData = {
  config: HomeSectionsConfig;
  news: Article[];
  jobs: HomeCard[];
  lostfound: HomeCard[];
  classifieds: HomeCard[];
};

// Đọc cấu hình + resolve item cho cả 4 khối — trang chủ chỉ việc render.
export async function loadHomeSections(): Promise<HomeSectionsData> {
  const config = await getHomeSections();
  const approved: Filter<Document> = { approved: true, active: true };
  const [news, jobCards, lfCards, clCards] = await Promise.all([
    config["tin-tuc"].enabled ? resolveNews(config["tin-tuc"]) : Promise.resolve([] as Article[]),
    config["viec-lam"].enabled
      ? pickDocs(await jobs(), approved as Filter<JobDoc>, config["viec-lam"]).then((ds) => ds.map(jobCard))
      : Promise.resolve([] as HomeCard[]),
    config["tim-do-roi"].enabled
      ? pickDocs(await lostFound(), approved as Filter<LostFoundDoc>, config["tim-do-roi"]).then((ds) => ds.map(lostfoundCard))
      : Promise.resolve([] as HomeCard[]),
    config["mua-ban"].enabled
      ? pickDocs(await classifieds(), approved as Filter<ClassifiedDoc>, config["mua-ban"]).then((ds) => ds.map(classifiedCard))
      : Promise.resolve([] as HomeCard[]),
  ]);
  return { config, news, jobs: jobCards, lostfound: lfCards, classifieds: clCards };
}

// Dải chạy Marquee dưới navbar — trả danh sách tiêu đề (chỉ từ Tin tức) theo cấu hình.
export async function loadMarquee(): Promise<string[]> {
  const cfg = (await getHomeSections()).marquee;
  if (!cfg.enabled) return [];
  const arts = await resolveNews(cfg);
  return arts.map((a) => a.title);
}

// ───────────────────────── Ứng viên cho picker thủ công (admin) ─────────────────────────
export type HomeCandidate = { slug: string; title: string };

export async function listHomeCandidates(): Promise<Record<HomeSectionKey, HomeCandidate[]>> {
  const [a, j, l, c] = await Promise.all([
    (await articles()).find({ status: "published" }).sort({ publishedAt: -1 }).limit(100).project<HomeCandidate>({ _id: 0, slug: 1, title: 1 }).toArray(),
    (await jobs()).find({ approved: true, active: true }).sort({ createdAt: -1 }).limit(100).project<HomeCandidate>({ _id: 0, slug: 1, title: 1 }).toArray(),
    (await lostFound()).find({ approved: true, active: true }).sort({ createdAt: -1 }).limit(100).project<HomeCandidate>({ _id: 0, slug: 1, title: 1 }).toArray(),
    (await classifieds()).find({ approved: true, active: true }).sort({ createdAt: -1 }).limit(100).project<HomeCandidate>({ _id: 0, slug: 1, title: 1 }).toArray(),
  ]);
  return { "tin-tuc": a, "viec-lam": j, "tim-do-roi": l, "mua-ban": c, "marquee": a };
}
