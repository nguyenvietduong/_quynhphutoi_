// Chợ & Mua bán — gộp 3 mảng: chợ phiên, đặc sản địa phương, rao vặt.
// Địa điểm CHUẨN HÓA: chỉ lưu wardSlug → bảng admin_units.
import { getDb, ensureIndexes } from "@/lib/db";
import { type Filter } from "mongodb";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { SeoFields } from "@/lib/seo-fields";
import { categoryName } from "@/lib/categories";

// Module danh mục dùng cho phân hệ Chợ & Mua bán (đọc từ collection `categories`).
const MODULE = "cho";

export type MarketDoc = {
  _id?: import("mongodb").ObjectId;
  slug: string;
  name: string;                 // tên chợ / tên đặc sản / tiêu đề rao vặt
  category: string;             // slug danh mục (module "cho")
  categoryLabel: string;        // denormalize

  wardSlug: string;             // FK → admin_units.slug
  address?: string;             // vị trí cụ thể

  description?: string;         // mô tả

  // Chợ phiên
  schedule?: string;            // lịch họp, vd "Phiên các ngày 1,6 âm lịch" / "Hàng ngày 5:00–11:00"

  // Đặc sản / rao vặt
  priceText?: string;           // giá tham khảo
  unit?: string;                // đơn vị (kg, con, suất…) — đặc sản

  // Rao vặt
  contactName?: string;
  contactPhone?: string;

  image?: string;               // ảnh đại diện (URL)
  seo?: SeoFields;              // ghi đè SEO trang chi tiết (tuỳ chọn)

  verified: boolean;
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function market() {
  const db = await getDb();
  const col = db.collection<MarketDoc>("market");
  await ensureIndexes("market", () => Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ category: 1, wardSlug: 1 }),
    col.createIndex({ name: "text", description: "text" }, { default_language: "none" }),
  ]));
  return col;
}

export type MarketListOpts = { category?: string; ward?: string; search?: string; activeOnly?: boolean; limit?: number; skip?: number };

export async function listMarket(opts: MarketListOpts = {}) {
  const col = await market();
  const filter: Filter<MarketDoc> = {};
  if (opts.category) filter.category = opts.category;
  if (opts.ward) filter.wardSlug = opts.ward;
  if (opts.activeOnly) filter.active = true;
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };
  const cursor = col.find(filter).sort({ featured: -1, category: 1, name: 1 });
  if (opts.skip) cursor.skip(opts.skip);
  if (opts.limit) cursor.limit(opts.limit);
  return cursor.toArray();
}

export async function getMarketBySlug(slug: string) {
  return (await market()).findOne({ slug });
}

export async function relatedMarket(slug: string, category: string, n = 3) {
  const col = await market();
  return col.find({ slug: { $ne: slug }, category, active: true }).sort({ name: 1 }).limit(n).toArray();
}

// ---- Admin CRUD ----
export type MarketInput = {
  name: string; category: string;
  wardSlug: string; address?: string; description?: string;
  schedule?: string; priceText?: string; unit?: string;
  contactName?: string; contactPhone?: string;
  image?: string;
  seo?: SeoFields;
  verified?: boolean; featured?: boolean; active?: boolean;
};

export async function createMarket(input: MarketInput) {
  const col = await market();
  const now = new Date();
  const slug = await uniqueSlug(col, slugify(input.name), "muc-cho");
  const doc: MarketDoc = {
    slug, name: input.name.trim(), category: input.category, categoryLabel: await categoryName(MODULE, input.category),
    wardSlug: input.wardSlug, address: input.address, description: input.description,
    schedule: input.schedule, priceText: input.priceText, unit: input.unit,
    contactName: input.contactName, contactPhone: input.contactPhone,
    image: input.image, seo: input.seo,
    verified: input.verified ?? false, featured: input.featured ?? false,
    active: input.active ?? true, createdAt: now, updatedAt: now,
  };
  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}

export async function updateMarket(slug: string, patch: Partial<MarketInput>) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
  if (patch.name) set.name = patch.name.trim();
  if (patch.category) set.categoryLabel = await categoryName(MODULE, patch.category);
  const res = await (await market()).updateOne({ slug }, { $set: set });
  return res.matchedCount;
}

export async function deleteMarket(slug: string) {
  const res = await (await market()).deleteOne({ slug });
  return res.deletedCount;
}

// Bản ghi phẳng cho client (admin). Import type-only ở client → không kéo mongodb vào bundle.
export type MarketRow = MarketInput & { slug: string };
export function toMarketRow(d: MarketDoc): MarketRow {
  return {
    slug: d.slug, name: d.name, category: d.category,
    wardSlug: d.wardSlug, address: d.address, description: d.description,
    schedule: d.schedule, priceText: d.priceText, unit: d.unit,
    contactName: d.contactName, contactPhone: d.contactPhone,
    image: d.image, seo: d.seo,
    verified: d.verified, featured: d.featured, active: d.active,
  };
}

export async function countByCategory(): Promise<Record<string, number>> {
  const col = await market();
  const rows = await col.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$category", n: { $sum: 1 } } }]).toArray();
  const out: Record<string, number> = {};
  for (const r of rows) if (r._id) out[r._id] = r.n;
  return out;
}
