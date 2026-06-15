// Mua bán (rao vặt) — người dân đăng tin mua/bán. Có kiểm duyệt như Việc làm/Tìm đồ rơi.
// Địa điểm CHUẨN HÓA: chỉ lưu wardSlug → admin_units.
import { getDb, ensureIndexes } from "@/lib/db";
import { ObjectId, type Filter } from "mongodb";
import { CLASSIFIED_CATEGORIES, categoryLabel, CONDITION_LABEL, type ClassifiedCategory, type ClassifiedCondition } from "@/lib/classified-categories";
import type { SeoFields } from "@/lib/seo-fields";

export { CLASSIFIED_CATEGORIES, categoryLabel, CONDITION_LABEL };
export type { ClassifiedCategory, ClassifiedCondition };
export type ClassifiedStatus = "open" | "sold" | "closed";

export type ClassifiedContact = { name: string; phone: string; email?: string; hidePhone?: boolean };
export type ClassifiedLocation = { wardSlug: string; address?: string; mapUrl?: string };

export type ClassifiedDoc = {
  _id?: ObjectId;
  slug: string;
  title: string;
  category: ClassifiedCategory;
  categoryLabel: string;
  description: string;          // HTML đã sanitize
  images?: string[];           // ảnh (URL /uploads/…)
  priceText: string;           // "8.500.000đ" / "Thỏa thuận"
  condition?: ClassifiedCondition;
  location: ClassifiedLocation;
  contact: ClassifiedContact;
  postedBy: ObjectId;
  postedByName: string;
  status: ClassifiedStatus;
  approved: boolean;
  verified: boolean;
  featured: boolean;
  views: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  soldAt: Date | null;
  seo?: SeoFields;
};

const toId = (v: ObjectId | string): ObjectId => (typeof v === "string" ? new ObjectId(v) : v);

export function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export async function classifieds() {
  const db = await getDb();
  const col = db.collection<ClassifiedDoc>("classifieds");
  await ensureIndexes("classifieds", () => Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ category: 1, status: 1, createdAt: -1 }),
    col.createIndex({ "location.wardSlug": 1, createdAt: -1 }),
    col.createIndex({ postedBy: 1, createdAt: -1 }),
    col.createIndex({ approved: 1, active: 1, createdAt: -1 }),
    col.createIndex({ title: "text", description: "text" }, { default_language: "none" }),
  ]));
  return col;
}

export type CreateClassifiedInput = {
  title: string;
  category: ClassifiedCategory;
  description: string;
  images?: string[];
  priceText: string;
  condition?: ClassifiedCondition;
  location: ClassifiedLocation;
  contact: ClassifiedContact;
  slug?: string;
  approved?: boolean;   // mặc định false (chờ duyệt)
};

async function uniqueSlug(col: import("mongodb").Collection<ClassifiedDoc>, base: string) {
  const root = base || "tin-rao-vat";
  let slug = root; let i = 2;
  while (await col.findOne({ slug })) slug = `${root}-${i++}`;
  return slug;
}

export async function createClassified(poster: { id: string; name: string }, input: CreateClassifiedInput) {
  const col = await classifieds();
  const now = new Date();
  const slug = await uniqueSlug(col, input.slug || slugify(input.title));
  const doc: ClassifiedDoc = {
    slug,
    title: input.title.trim(),
    category: input.category,
    categoryLabel: categoryLabel(input.category),
    description: input.description,
    images: input.images ?? [],
    priceText: input.priceText.trim() || "Thỏa thuận",
    condition: input.condition,
    location: input.location,
    contact: input.contact,
    postedBy: new ObjectId(poster.id),
    postedByName: poster.name,
    status: "open",
    approved: input.approved ?? false,
    verified: false,
    featured: false,
    views: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
    soldAt: null,
  };
  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}

export type ListClassifiedOpts = {
  category?: ClassifiedCategory;
  wardSlug?: string;
  status?: ClassifiedStatus;
  search?: string;
  approvedOnly?: boolean;
  approved?: boolean;
  limit?: number;
  skip?: number;
};

function buildFilter(opts: ListClassifiedOpts): Filter<ClassifiedDoc> {
  const filter: Filter<ClassifiedDoc> = {};
  if (opts.approvedOnly !== false) { filter.approved = true; filter.active = true; }
  if (typeof opts.approved === "boolean") filter.approved = opts.approved;
  if (opts.category) filter.category = opts.category;
  if (opts.wardSlug) filter["location.wardSlug"] = opts.wardSlug;
  if (opts.status) filter.status = opts.status;
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };
  return filter;
}

export async function listClassifieds(opts: ListClassifiedOpts = {}) {
  const col = await classifieds();
  const cur = col.find(buildFilter(opts)).sort({ featured: -1, createdAt: -1 });
  if (opts.skip) cur.skip(opts.skip);
  if (opts.limit) cur.limit(opts.limit);
  return cur.toArray();
}
export async function countClassifieds(opts: ListClassifiedOpts = {}) {
  return (await classifieds()).countDocuments(buildFilter(opts));
}
export async function listMyClassifieds(userId: ObjectId | string) {
  return (await classifieds()).find({ postedBy: toId(userId) }).sort({ createdAt: -1 }).toArray();
}
export async function listPendingClassifieds(opts: { limit?: number } = {}) {
  const col = await classifieds();
  const cur = col.find({ approved: false, active: true }).sort({ createdAt: 1 });
  if (opts.limit) cur.limit(opts.limit);
  return cur.toArray();
}
export async function getClassifiedBySlug(slug: string) {
  return (await classifieds()).findOne({ slug });
}
export async function relatedClassifieds(slug: string, category: ClassifiedCategory, n = 3) {
  const col = await classifieds();
  return col.find({ slug: { $ne: slug }, category, approved: true, active: true }).sort({ createdAt: -1 }).limit(n).toArray();
}
export async function countByCategory(): Promise<Record<ClassifiedCategory, number>> {
  const col = await classifieds();
  const rows = await col.aggregate<{ _id: ClassifiedCategory; n: number }>([
    { $match: { approved: true, active: true } }, { $group: { _id: "$category", n: { $sum: 1 } } },
  ]).toArray();
  const out = { "xe-co": 0, "bat-dong-san": 0, "dien-tu": 0, "do-gia-dung": 0, "nong-san-vat-nuoi": 0, "thoi-trang": 0, "khac": 0 } as Record<ClassifiedCategory, number>;
  for (const r of rows) out[r._id] = r.n;
  return out;
}

export async function incrementViews(slug: string) {
  await (await classifieds()).updateOne({ slug }, { $inc: { views: 1 } });
}
export async function markSold(slug: string) {
  const now = new Date();
  await (await classifieds()).updateOne({ slug }, { $set: { status: "sold", soldAt: now, updatedAt: now } });
}
export async function approveClassified(slug: string, approved = true) {
  await (await classifieds()).updateOne({ slug }, { $set: { approved, updatedAt: new Date() } });
}
export async function deleteClassified(slug: string) {
  const res = await (await classifieds()).deleteOne({ slug });
  return res.deletedCount;
}

export async function countPendingClassifieds() {
  return (await classifieds()).countDocuments({ approved: false, active: true });
}

// Admin sửa nội dung tin. Chỉ nhận field cho phép; tự tính lại categoryLabel khi đổi danh mục.
export type ClassifiedPatch = Partial<{
  title: string; category: ClassifiedCategory; description: string; images: string[];
  priceText: string; condition: ClassifiedCondition; location: ClassifiedLocation;
  contact: ClassifiedContact; status: ClassifiedStatus; approved: boolean; verified: boolean;
  featured: boolean; active: boolean; seo: SeoFields;
}> & { "location.address"?: string; "location.mapUrl"?: string };

export async function updateClassified(slug: string, patch: ClassifiedPatch) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
  if (patch.category) set.categoryLabel = categoryLabel(patch.category);
  if (patch.title) set.title = patch.title.trim();
  const res = await (await classifieds()).updateOne({ slug }, { $set: set });
  return res.matchedCount;
}
