// Di tích lịch sử - văn hoá Quỳnh Phụ: đình, chùa, đền, miếu, nhà thờ…
// Địa điểm CHUẨN HÓA: chỉ lưu wardSlug → bảng admin_units.
// Phân loại (loại + xếp hạng) đọc từ categories: module "di-tich" & "xep-hang-di-tich".
import { getDb, ensureIndexes } from "@/lib/db";
import { type Filter } from "mongodb";
import { slugify, uniqueSlug } from "@/lib/slug";
import { categoryName } from "@/lib/categories";
import type { SeoFields } from "@/lib/seo-fields";

export type RelicDoc = {
  _id?: import("mongodb").ObjectId;
  slug: string;
  name: string;                 // tên di tích
  type: string;                 // slug loại — danh mục module "di-tich"
  typeLabel: string;            // denormalize

  wardSlug: string;             // FK → admin_units.slug
  address?: string;             // vị trí cụ thể (thôn/xóm)

  description?: string;         // giới thiệu
  era?: string;                 // niên đại, vd "Thời Trần (thế kỷ XIII)"
  worship?: string;             // thờ ai / sự tích
  festival?: string;            // lễ hội chính

  ranking?: string;             // slug xếp hạng — danh mục module "xep-hang-di-tich"
  recognizedYear?: number;      // năm được xếp hạng

  images: string[];
  seo?: SeoFields;              // ghi đè SEO trang chi tiết (tuỳ chọn)

  verified: boolean;
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function relics() {
  const db = await getDb();
  const col = db.collection<RelicDoc>("relics");
  await ensureIndexes("relics", () => Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ type: 1, wardSlug: 1 }),
    col.createIndex({ name: "text", description: "text" }, { default_language: "none" }),
  ]));
  return col;
}

export type RelicListOpts = { type?: string; ward?: string; search?: string; activeOnly?: boolean; limit?: number; skip?: number };

export async function listRelics(opts: RelicListOpts = {}) {
  const col = await relics();
  const filter: Filter<RelicDoc> = {};
  if (opts.type) filter.type = opts.type;
  if (opts.ward) filter.wardSlug = opts.ward;
  if (opts.activeOnly) filter.active = true;
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };
  const cursor = col.find(filter).sort({ featured: -1, type: 1, name: 1 });
  if (opts.skip) cursor.skip(opts.skip);
  if (opts.limit) cursor.limit(opts.limit);
  return cursor.toArray();
}

export async function getRelicBySlug(slug: string) {
  return (await relics()).findOne({ slug });
}

export async function relatedRelics(slug: string, type: string, n = 3) {
  const col = await relics();
  return col.find({ slug: { $ne: slug }, type, active: true }).sort({ name: 1 }).limit(n).toArray();
}

// ---- Admin CRUD ----
export type RelicInput = {
  name: string; type: string;
  wardSlug: string; address?: string; description?: string;
  era?: string; worship?: string; festival?: string;
  ranking?: string; recognizedYear?: number; images?: string[];
  verified?: boolean; featured?: boolean; active?: boolean;
  seo?: SeoFields;
};

export async function createRelic(input: RelicInput) {
  const col = await relics();
  const now = new Date();
  const slug = await uniqueSlug(col, slugify(input.name), "di-tich");
  const doc: RelicDoc = {
    slug, name: input.name.trim(), type: input.type, typeLabel: await categoryName("di-tich", input.type),
    wardSlug: input.wardSlug, address: input.address, description: input.description,
    era: input.era, worship: input.worship, festival: input.festival,
    ranking: input.ranking, recognizedYear: input.recognizedYear, images: input.images ?? [],
    seo: input.seo,
    verified: input.verified ?? false, featured: input.featured ?? false,
    active: input.active ?? true, createdAt: now, updatedAt: now,
  };
  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}

export async function updateRelic(slug: string, patch: Partial<RelicInput>) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
  if (patch.name) set.name = patch.name.trim();
  if (patch.type) set.typeLabel = await categoryName("di-tich", patch.type);
  const res = await (await relics()).updateOne({ slug }, { $set: set });
  return res.matchedCount;
}

export async function deleteRelic(slug: string) {
  const res = await (await relics()).deleteOne({ slug });
  return res.deletedCount;
}

// Bản ghi phẳng cho client (admin). Import type-only ở client → không kéo mongodb vào bundle.
export type RelicRow = RelicInput & { slug: string; images: string[] };
export function toRelicRow(d: RelicDoc): RelicRow {
  return {
    slug: d.slug, name: d.name, type: d.type, wardSlug: d.wardSlug, address: d.address,
    description: d.description, era: d.era, worship: d.worship, festival: d.festival,
    ranking: d.ranking, recognizedYear: d.recognizedYear, images: d.images ?? [],
    verified: d.verified, featured: d.featured, active: d.active, seo: d.seo,
  };
}

// Đếm số di tích theo từng slug loại (build động — không hằng số).
export async function countByType(): Promise<Record<string, number>> {
  const col = await relics();
  const rows = await col.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$type", n: { $sum: 1 } } }]).toArray();
  const out: Record<string, number> = {};
  for (const r of rows) out[r._id] = r.n;
  return out;
}
