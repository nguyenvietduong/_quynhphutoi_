// Cơ sở y tế xã Quỳnh Phụ — danh bạ: bệnh viện, trung tâm y tế, trạm y tế,
// phòng khám, nhà thuốc. Mô hình giống lib/schools.ts; địa chỉ CHUẨN HÓA:
// chỉ lưu khóa ngoại `wardSlug` → bảng admin_units.
import { getDb, ensureIndexes } from "@/lib/db";
import { type Filter } from "mongodb";
import { slugify, uniqueSlug } from "@/lib/slug";
import { categoryName } from "@/lib/categories";
import type { SeoFields } from "@/lib/seo-fields";

export type HealthDoc = {
  _id?: import("mongodb").ObjectId;
  slug: string;
  name: string;
  shortName?: string;
  type: string;               // slug danh mục module "y-te"
  typeLabel: string;          // denormalize
  ownership: string;          // slug danh mục module "so-huu-y-te"

  verified: boolean;
  sourceUrl?: string;

  wardSlug: string;           // FK → admin_units.slug
  address?: string;           // chi tiết đường/khu (tùy chọn)

  phone?: string;
  email?: string;
  website?: string;
  director?: string;          // giám đốc / trưởng trạm

  hours?: string;             // giờ làm việc, vd "7:00–17:00"
  emergency?: boolean;        // có cấp cứu 24/7
  beds?: number;              // số giường (bệnh viện)
  specialties?: string;       // chuyên khoa chính

  foundedYear?: number;
  description?: string;
  coords?: { lat: number; lng: number };
  seo?: SeoFields;            // ghi đè SEO trang chi tiết (tuỳ chọn)

  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function health() {
  const db = await getDb();
  const col = db.collection<HealthDoc>("health");
  await ensureIndexes("health", () => Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ type: 1, wardSlug: 1 }),
    col.createIndex({ wardSlug: 1, type: 1 }),
    col.createIndex({ name: "text" }, { default_language: "none" }),
  ]));
  return col;
}

export type HealthListOpts = {
  type?: string;
  ward?: string;
  ownership?: string;
  search?: string;
  activeOnly?: boolean;
  limit?: number;
  skip?: number;
};

export async function listHealth(opts: HealthListOpts = {}) {
  const col = await health();
  const filter: Filter<HealthDoc> = {};
  if (opts.type) filter.type = opts.type;
  if (opts.ward) filter.wardSlug = opts.ward;
  if (opts.ownership) filter.ownership = opts.ownership;
  if (opts.activeOnly) filter.active = true;
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };

  const cursor = col.find(filter).sort({ type: 1, name: 1 });
  if (opts.skip) cursor.skip(opts.skip);
  if (opts.limit) cursor.limit(opts.limit);
  return cursor.toArray();
}

export async function getHealthBySlug(slug: string) {
  return (await health()).findOne({ slug });
}

export async function listByWard(wardSlug: string) {
  return (await health()).find({ wardSlug }).sort({ type: 1, name: 1 }).toArray();
}

// ---- Admin CRUD ----
export type HealthInput = {
  name: string; shortName?: string;
  type: string; ownership: string;
  wardSlug: string; address?: string;
  phone?: string; email?: string; website?: string; director?: string;
  hours?: string; emergency?: boolean; beds?: number; specialties?: string;
  foundedYear?: number; description?: string;
  verified?: boolean; active?: boolean; sourceUrl?: string;
  seo?: SeoFields;
};

export async function createHealth(input: HealthInput) {
  const col = await health();
  const now = new Date();
  const slug = await uniqueSlug(col, slugify(input.name), "co-so-y-te");
  const doc: HealthDoc = {
    slug, name: input.name.trim(), shortName: input.shortName?.trim() || undefined,
    type: input.type, typeLabel: await categoryName("y-te", input.type), ownership: input.ownership,
    verified: input.verified ?? false, sourceUrl: input.sourceUrl,
    wardSlug: input.wardSlug, address: input.address,
    phone: input.phone, email: input.email, website: input.website, director: input.director,
    hours: input.hours, emergency: input.emergency ?? false, beds: input.beds, specialties: input.specialties,
    foundedYear: input.foundedYear, description: input.description, seo: input.seo,
    active: input.active ?? true, createdAt: now, updatedAt: now,
  };
  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}

export async function updateHealth(slug: string, patch: Partial<HealthInput>) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
  if (patch.name) set.name = patch.name.trim();
  if (patch.type) set.typeLabel = await categoryName("y-te", patch.type);
  const res = await (await health()).updateOne({ slug }, { $set: set });
  return res.matchedCount;
}

export async function deleteHealth(slug: string) {
  const res = await (await health()).deleteOne({ slug });
  return res.deletedCount;
}

// Bản ghi phẳng cho client (admin). Import type-only ở client → không kéo mongodb vào bundle.
export type HealthRow = HealthInput & { slug: string; verified: boolean; active: boolean };
export function toHealthRow(d: HealthDoc): HealthRow {
  return {
    slug: d.slug, name: d.name, shortName: d.shortName, type: d.type, ownership: d.ownership,
    wardSlug: d.wardSlug, address: d.address, phone: d.phone, email: d.email, website: d.website,
    director: d.director, hours: d.hours, emergency: d.emergency, beds: d.beds, specialties: d.specialties,
    foundedYear: d.foundedYear, description: d.description, sourceUrl: d.sourceUrl,
    verified: d.verified, active: d.active, seo: d.seo,
  };
}

// Đếm theo từng loại cơ sở (cho thẻ thống kê / tab) — Record động theo slug danh mục.
export async function countByType(): Promise<Record<string, number>> {
  const col = await health();
  const rows = await col.aggregate<{ _id: string; n: number }>([
    { $group: { _id: "$type", n: { $sum: 1 } } },
  ]).toArray();
  const out: Record<string, number> = {};
  for (const r of rows) if (r._id) out[r._id] = r.n;
  return out;
}
