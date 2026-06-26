// Bài viết tin tức — schema đầy đủ như một bài báo thật: nội dung dạng khối,
// tác giả, ảnh bìa, lượt xem, trạng thái xuất bản và khối SEO (meta + Open Graph
// + JSON-LD). Theo pattern repo: mongodb native driver, helper trong file này.
//
// Lưu ý: trang hiện dùng dữ liệu tĩnh ở lib/news.ts. File này là tầng DB để
// chuyển sang nội dung thật — xem ghi chú "mapping" cuối file để gắn vào page.

import { getDb, ensureIndexes } from "@/lib/db";
import { SITE } from "@/lib/seo";
import { ObjectId, type Filter } from "mongodb";
import { slugify, uniqueSlug } from "@/lib/slug";
import { formatDate } from "@/lib/datetime";
import type { ArticleScope } from "@/lib/news";

// ---- Nội dung bài viết dạng khối (giống CMS thật) ----
// "html": khối HTML thô (đã sanitize) — dùng khi soạn bằng RichTextEditor ở admin.
export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "image"; src: string; alt?: string; caption?: string }
  | { type: "html"; html: string };

export type ArticleAuthor = {
  name: string;
  title?: string;      // chức danh / đơn vị
  avatarUrl?: string;
};

// Khối SEO — đủ để dựng <meta>, Open Graph, robots, canonical.
export type ArticleSeo = {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;     // mặc định "article"
  noindex?: boolean;
};

export type ArticleStatus = "draft" | "published";

export type ArticleDoc = {
  _id?: ObjectId;
  slug: string;            // định danh trên URL (duy nhất)
  title: string;
  excerpt: string;         // sapo / tóm tắt
  category: string;        // "Thông báo" | "Đời sống" | "Kinh tế" | "Giáo dục"
  categorySlug: string;    // "thong-bao" | "doi-song" | ...
  scope?: ArticleScope;    // trong-xa (mặc định) | ngoai-xa. Thiếu = trong-xa (bài cũ).
  tags: string[];
  coverImage: string;
  coverAlt?: string;
  author: ArticleAuthor;
  body: ArticleBlock[];
  readingMinutes: number;
  views: number;
  featured: boolean;
  status: ArticleStatus;
  seo: ArticleSeo;
  // Bài do NGƯỜI DÙNG gửi (giống việc làm/mua bán): có người gửi + cờ duyệt.
  // Bài admin tạo: không có postedBy, approved/active mặc định true.
  postedBy?: ObjectId;       // chủ bài (người dùng gửi)
  postedByName?: string;
  approved?: boolean;        // false = chờ admin duyệt; thiếu/true = đã duyệt
  approvedBy?: string; approvedByName?: string; approvedAt?: Date;
  active?: boolean;          // false = đã ẩn/gỡ; thiếu/true = đang hiển thị
  flags?: string[];          // cờ kiểm duyệt tự động (từ cấm + vi phạm chính sách) — báo admin xem
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const SITE_URL = SITE.url;

export async function articles() {
  const db = await getDb();
  const col = db.collection<ArticleDoc>("articles");
  // Tạo index đúng MỘT lần / tiến trình (song song), thay vì mỗi request.
  await ensureIndexes("articles", () => Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ status: 1, publishedAt: -1 }),
    col.createIndex({ categorySlug: 1, publishedAt: -1 }),
    col.createIndex({ scope: 1, publishedAt: -1 }),
    col.createIndex({ featured: 1, publishedAt: -1 }),
    // Bài người dùng: theo chủ bài & hàng chờ duyệt.
    col.createIndex({ postedBy: 1, createdAt: -1 }),
    col.createIndex({ approved: 1, active: 1, createdAt: 1 }),
    // Tìm kiếm tiếng Việt cơ bản trên tiêu đề / tóm tắt / thẻ.
    col.createIndex({ title: "text", excerpt: "text", tags: "text" }, { default_language: "none" }),
  ]));
  return col;
}

// ---- Truy vấn ----
export async function getArticleBySlug(slug: string) {
  return (await articles()).findOne({ slug });
}

export type ListOpts = {
  category?: string;        // lọc theo categorySlug
  scope?: ArticleScope;     // lọc theo phạm vi (trong/ngoài xã)
  status?: ArticleStatus;   // mặc định "published"
  search?: string;
  featured?: boolean;
  approvedOnly?: boolean;   // mặc định true: chỉ bài đã duyệt + đang hiển thị
  limit?: number;
  skip?: number;
  sort?: "newest" | "oldest" | "popular";
};

// Điều kiện bài hiển thị công khai: đã duyệt (approved != false) & đang bật (active != false).
// Dùng $ne:false để bài admin cũ (thiếu field) vẫn coi như công khai — không cần migrate.
const PUBLIC_GATE = { approved: { $ne: false as const }, active: { $ne: false as const } };

// Lọc theo phạm vi: "ngoai-xa" khớp đúng; "trong-xa" gồm cả bài cũ thiếu field.
const scopeFilter = (scope: ArticleScope) =>
  scope === "ngoai-xa" ? "ngoai-xa" as const : { $ne: "ngoai-xa" as const };

export async function listArticles(opts: ListOpts = {}) {
  const col = await articles();
  const filter: Filter<ArticleDoc> = { status: opts.status ?? "published" };
  if (opts.approvedOnly !== false) Object.assign(filter, PUBLIC_GATE);
  if (opts.category) filter.categorySlug = opts.category;
  if (opts.scope) filter.scope = scopeFilter(opts.scope);
  if (typeof opts.featured === "boolean") filter.featured = opts.featured;
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };

  const sort: Record<string, 1 | -1> =
    opts.sort === "oldest" ? { publishedAt: 1 }
    : opts.sort === "popular" ? { views: -1 }
    : { publishedAt: -1 };

  const cursor = col.find(filter).sort(sort);
  if (opts.skip) cursor.skip(opts.skip);
  if (opts.limit) cursor.limit(opts.limit);
  return cursor.toArray();
}

export async function countArticles(opts: ListOpts = {}) {
  const col = await articles();
  const filter: Filter<ArticleDoc> = { status: opts.status ?? "published" };
  if (opts.approvedOnly !== false) Object.assign(filter, PUBLIC_GATE);
  if (opts.category) filter.categorySlug = opts.category;
  if (opts.scope) filter.scope = scopeFilter(opts.scope);
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };
  return col.countDocuments(filter);
}

// Bài liên quan: ưu tiên cùng chuyên mục, mới nhất.
export async function relatedArticles(slug: string, n = 3) {
  const col = await articles();
  const cur = await col.findOne({ slug });
  if (!cur) return [];
  const same = await col
    .find({ slug: { $ne: slug }, categorySlug: cur.categorySlug, status: "published", ...PUBLIC_GATE })
    .sort({ publishedAt: -1 }).limit(n).toArray();
  if (same.length >= n) return same;
  const fillIds = same.map((a) => a._id);
  const rest = await col
    .find({ slug: { $ne: slug }, _id: { $nin: fillIds }, status: "published", ...PUBLIC_GATE })
    .sort({ publishedAt: -1 }).limit(n - same.length).toArray();
  return [...same, ...rest];
}

// Tăng lượt xem (an toàn khi gọi từ trang chi tiết).
export async function incrementViews(slug: string) {
  const col = await articles();
  await col.updateOne({ slug }, { $inc: { views: 1 } });
}

// ---- SEO ----
export function articleUrl(a: Pick<ArticleDoc, "slug">) {
  return `${SITE_URL}/tin-tuc/${a.slug}`;
}

// Dựng object Metadata cho Next (generateMetadata) — meta + Open Graph + robots.
export function buildArticleMetadata(a: ArticleDoc) {
  const url = a.seo.canonicalUrl || articleUrl(a);
  const ogImage = a.seo.ogImage || a.coverImage;
  return {
    title: a.seo.metaTitle || a.title,
    description: a.seo.metaDescription || a.excerpt,
    keywords: a.seo.keywords?.length ? a.seo.keywords : a.tags,
    alternates: { canonical: url },
    robots: a.seo.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: (a.seo.ogType || "article") as "article",
      url,
      title: a.seo.metaTitle || a.title,
      description: a.seo.metaDescription || a.excerpt,
      images: ogImage ? [{ url: ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}` }] : [],
      publishedTime: a.publishedAt?.toISOString(),
      modifiedTime: a.updatedAt?.toISOString(),
      authors: [a.author.name],
      tags: a.tags,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: a.seo.metaTitle || a.title,
      description: a.seo.metaDescription || a.excerpt,
      images: ogImage ? [ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`] : [],
    },
  };
}

// Dữ liệu có cấu trúc JSON-LD (schema.org/NewsArticle) — chèn vào <script type="application/ld+json">.
export function buildArticleJsonLd(a: ArticleDoc) {
  const img = a.coverImage.startsWith("http") ? a.coverImage : `${SITE_URL}${a.coverImage}`;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    description: a.excerpt,
    image: [img],
    datePublished: a.publishedAt?.toISOString(),
    dateModified: a.updatedAt?.toISOString(),
    author: [{ "@type": "Person", name: a.author.name }],
    publisher: {
      "@type": "Organization",
      name: "Trang cộng đồng Quỳnh Phụ",
      logo: { "@type": "ImageObject", url: `${SITE_URL}${SITE.logo}` },
    },
    articleSection: a.category,
    keywords: (a.seo.keywords?.length ? a.seo.keywords : a.tags).join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl(a) },
  };
}

// ---- Tiện ích ----
// Ước lượng phút đọc từ nội dung khối (~200 từ/phút).
export function estimateReadingMinutes(body: ArticleBlock[]) {
  const words = body.reduce((sum, b) => {
    if (b.type === "list") return sum + b.items.join(" ").split(/\s+/).length;
    if (b.type === "html") return sum + b.html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    if ("text" in b && b.text) return sum + b.text.split(/\s+/).length;
    return sum;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}

// ---- Admin CRUD ----
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Chuyển khối nội dung → HTML để nạp vào RichTextEditor khi sửa.
export function blocksToHtml(body: ArticleBlock[]): string {
  return body.map((b) => {
    switch (b.type) {
      case "html": return b.html;
      case "h2": return `<h2>${esc(b.text)}</h2>`;
      case "h3": return `<h3>${esc(b.text)}</h3>`;
      case "quote": return `<blockquote>${esc(b.text)}</blockquote>`;
      case "p": return `<p>${esc(b.text)}</p>`;
      case "list": {
        const tag = b.ordered ? "ol" : "ul";
        return `<${tag}>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</${tag}>`;
      }
      case "image": return `<p><img src="${b.src}" alt="${esc(b.alt || "")}" /></p>`;
    }
  }).join("\n");
}

export type ArticleInput = {
  title: string; excerpt: string;
  category: string; categorySlug?: string; scope?: ArticleScope; tags?: string[];
  coverImage: string; coverAlt?: string;
  author: ArticleAuthor;
  bodyHtml: string;          // HTML đã sanitize ở tầng route → lưu thành 1 khối "html"
  featured?: boolean;
  status?: ArticleStatus;
  seo?: ArticleSeo;
  // Khi bài do người dùng gửi (không bắt buộc với admin):
  postedBy?: string;         // _id người gửi
  postedByName?: string;
  approved?: boolean;        // mặc định true (admin); route đăng tin truyền false để chờ duyệt
  active?: boolean;          // mặc định true
  flags?: string[];          // cờ kiểm duyệt tự động (báo admin)
};

export async function createArticle(input: ArticleInput) {
  const col = await articles();
  const now = new Date();
  const slug = await uniqueSlug(col, slugify(input.title), "bai-viet");
  const body: ArticleBlock[] = [{ type: "html", html: input.bodyHtml }];
  const status = input.status ?? "draft";
  const doc: ArticleDoc = {
    slug, title: input.title.trim(), excerpt: input.excerpt.trim(),
    category: input.category, categorySlug: input.categorySlug || slugify(input.category),
    scope: input.scope === "ngoai-xa" ? "ngoai-xa" : "trong-xa",
    tags: input.tags ?? [], coverImage: input.coverImage, coverAlt: input.coverAlt,
    author: input.author, body, readingMinutes: estimateReadingMinutes(body), views: 0,
    featured: input.featured ?? false, status, seo: input.seo ?? {},
    postedBy: input.postedBy ? new ObjectId(input.postedBy) : undefined,
    postedByName: input.postedByName,
    approved: input.approved ?? true,
    active: input.active ?? true,
    flags: input.flags?.length ? input.flags : undefined,
    publishedAt: status === "published" ? now : null, createdAt: now, updatedAt: now,
  };
  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}

export async function updateArticle(slug: string, patch: Partial<ArticleInput>) {
  const col = await articles();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title.trim();
  if (patch.excerpt !== undefined) set.excerpt = patch.excerpt.trim();
  if (patch.category !== undefined) { set.category = patch.category; set.categorySlug = patch.categorySlug || slugify(patch.category); }
  if (patch.scope !== undefined) set.scope = patch.scope === "ngoai-xa" ? "ngoai-xa" : "trong-xa";
  if (patch.tags !== undefined) set.tags = patch.tags;
  if (patch.coverImage !== undefined) set.coverImage = patch.coverImage;
  if (patch.coverAlt !== undefined) set.coverAlt = patch.coverAlt;
  if (patch.author !== undefined) set.author = patch.author;
  if (patch.featured !== undefined) set.featured = patch.featured;
  if (patch.seo !== undefined) set.seo = patch.seo;
  if (patch.bodyHtml !== undefined) {
    const body: ArticleBlock[] = [{ type: "html", html: patch.bodyHtml }];
    set.body = body; set.readingMinutes = estimateReadingMinutes(body);
  }
  if (patch.status !== undefined) {
    set.status = patch.status;
    const cur = await col.findOne({ slug });
    if (patch.status === "published" && cur && !cur.publishedAt) set.publishedAt = new Date();
  }
  const res = await col.updateOne({ slug }, { $set: set });
  return res.matchedCount;
}

export async function deleteArticle(slug: string) {
  const res = await (await articles()).deleteOne({ slug });
  return res.deletedCount;
}

// ---- Bài do người dùng gửi (chờ duyệt) ----
const toId = (v: ObjectId | string): ObjectId => (typeof v === "string" ? new ObjectId(v) : v);

// Bài của 1 người dùng (mọi trạng thái) — cho trang "Bài đăng của tôi".
export async function listMyArticles(userId: ObjectId | string) {
  return (await articles()).find({ postedBy: toId(userId) }).sort({ createdAt: -1 }).toArray();
}

// Hàng chờ duyệt (bài người dùng) cho admin.
export async function listPendingArticles(opts: { limit?: number } = {}) {
  const col = await articles();
  const cur = col.find({ approved: false, active: { $ne: false } }).sort({ createdAt: 1 });
  if (opts.limit) cur.limit(opts.limit);
  return cur.toArray();
}

export async function countPendingArticles() {
  return (await articles()).countDocuments({ approved: false, active: { $ne: false } });
}

// Duyệt / bỏ duyệt 1 bài. Khi duyệt mà chưa có ngày xuất bản → đặt ngay.
export async function approveArticle(slug: string, approved = true, by?: { id: string; name: string }) {
  const col = await articles();
  const now = new Date();
  const set: Record<string, unknown> = { approved, updatedAt: now };
  if (approved) {
    const cur = await col.findOne({ slug });
    if (cur && !cur.publishedAt) set.publishedAt = now;
    if (by) { set.approvedBy = by.id; set.approvedByName = by.name; set.approvedAt = now; }
  } else {
    set.approvedBy = null; set.approvedByName = null; set.approvedAt = null;
  }
  await col.updateOne({ slug }, { $set: set });
}

// Liệt kê toàn bộ (cả draft) cho admin.
export async function listAllArticles(opts: { search?: string; status?: ArticleStatus } = {}) {
  const col = await articles();
  const filter: Filter<ArticleDoc> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };
  return col.find(filter).sort({ updatedAt: -1 }).toArray();
}

// Bản ghi phẳng cho client admin (type-only import ở client).
export type ArticleRow = {
  slug: string; title: string; excerpt: string; category: string; categorySlug: string; scope: ArticleScope;
  tags: string[]; coverImage: string; coverAlt: string;
  authorName: string; authorTitle: string; authorAvatar: string;
  bodyHtml: string; featured: boolean; status: ArticleStatus;
  seo: ArticleSeo; views: number; publishedAt: string | null;
  approved: boolean; pending: boolean; postedByName: string;   // bài người dùng gửi
  approvedByName?: string; approvedAt?: string | null;          // ai duyệt, khi nào
  flags: string[];   // cờ kiểm duyệt tự động (từ cấm + vi phạm chính sách)
};
// Map sang shape Article tĩnh (lib/news.ts) để tái dùng NewsCard / NewsBrowser ở trang public.
export function toNewsCardArticle(d: ArticleDoc): import("@/lib/news").Article {
  const dd = d.publishedAt ?? d.createdAt;
  const date = dd ? formatDate(dd, "") : "";
  return {
    id: d.slug, slug: d.slug, category: d.category as import("@/lib/news").NewsCategory,
    scope: d.scope === "ngoai-xa" ? "ngoai-xa" : "trong-xa",
    title: d.title, excerpt: d.excerpt, image: d.coverImage, date,
    readTime: `${d.readingMinutes} phút đọc`, author: d.author?.name ?? "", tags: d.tags ?? [],
    views: d.views ?? 0,
  };
}

export function toArticleRow(d: ArticleDoc): ArticleRow {
  return {
    slug: d.slug, title: d.title, excerpt: d.excerpt, category: d.category, categorySlug: d.categorySlug,
    scope: d.scope === "ngoai-xa" ? "ngoai-xa" : "trong-xa",
    tags: d.tags ?? [], coverImage: d.coverImage, coverAlt: d.coverAlt ?? "",
    authorName: d.author?.name ?? "", authorTitle: d.author?.title ?? "", authorAvatar: d.author?.avatarUrl ?? "",
    bodyHtml: blocksToHtml(d.body ?? []), featured: d.featured, status: d.status,
    seo: d.seo ?? {}, views: d.views ?? 0,
    publishedAt: d.publishedAt ? d.publishedAt.toISOString() : null,
    approved: d.approved !== false, pending: d.approved === false, postedByName: d.postedByName ?? "",
    approvedByName: d.approvedByName ?? undefined, approvedAt: d.approvedAt ? (d.approvedAt as Date).toISOString() : null,
    flags: d.flags ?? [],
  };
}

/* ── Mapping sang trang hiện tại (lib/news.ts shape) ──────────────────────────
   Trang [slug]/page.tsx & NewsBrowser đang đọc Article tĩnh. Để dùng DB:
     const a = await getArticleBySlug(slug);
     export const generateMetadata = () => buildArticleMetadata(a);
   Các trường tương đương: image → coverImage, readTime → `${readingMinutes} phút đọc`,
   author(string) → author.name, date(dd/mm/yyyy) → publishedAt, body → a.body.
   (Việc refactor page để đọc DB là bước sau, ngoài phạm vi tạo schema + seed.) */
