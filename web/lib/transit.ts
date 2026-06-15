// Giao thông — tuyến xe khách / xe buýt qua huyện Quỳnh Phụ.
// Tuyến đi qua nhiều xã nên KHÔNG gắn 1 wardSlug; lưu điểm đầu/cuối + điểm dừng dạng text.
import { getDb, ensureIndexes } from "@/lib/db";
import { type Filter } from "mongodb";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { SeoFields } from "@/lib/seo-fields";

export type TransitType = "lien-tinh" | "noi-tinh" | "xe-buyt";

export const TRANSIT_TYPES: { slug: TransitType; label: string; order: number }[] = [
  { slug: "lien-tinh", label: "Liên tỉnh", order: 1 },
  { slug: "noi-tinh", label: "Nội tỉnh", order: 2 },
  { slug: "xe-buyt", label: "Xe buýt", order: 3 },
];
export const typeLabel = (t: TransitType) => TRANSIT_TYPES.find((x) => x.slug === t)?.label ?? t;

export type TransitDoc = {
  _id?: import("mongodb").ObjectId;
  slug: string;
  name: string;               // "Quỳnh Côi – Hà Nội"
  type: TransitType;
  typeLabel: string;          // denormalize

  origin: string;             // điểm đầu
  destination: string;        // điểm cuối
  stops: string[];            // các điểm dừng / đón chính (lộ trình)

  operator?: string;          // nhà xe
  phone?: string;             // SĐT đặt vé
  fare?: string;              // giá vé, vd "70.000đ"
  frequency?: string;         // tần suất, vd "30 phút/chuyến" hoặc "5:00–18:00"
  duration?: string;          // thời gian, vd "2 giờ"
  distance?: string;          // quãng đường, vd "110 km"
  note?: string;              // lưu ý
  seo?: SeoFields;            // ghi đè SEO trang chi tiết (tuỳ chọn)

  verified: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function transit() {
  const db = await getDb();
  const col = db.collection<TransitDoc>("transit");
  await ensureIndexes("transit", () => Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ type: 1, name: 1 }),
    col.createIndex({ name: "text", origin: "text", destination: "text" }, { default_language: "none" }),
  ]));
  return col;
}

export type TransitListOpts = { type?: TransitType; search?: string; activeOnly?: boolean; limit?: number; skip?: number };

export async function listTransit(opts: TransitListOpts = {}) {
  const col = await transit();
  const filter: Filter<TransitDoc> = {};
  if (opts.type) filter.type = opts.type;
  if (opts.activeOnly) filter.active = true;
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };
  const cursor = col.find(filter).sort({ type: 1, name: 1 });
  if (opts.skip) cursor.skip(opts.skip);
  if (opts.limit) cursor.limit(opts.limit);
  return cursor.toArray();
}

export async function getTransitBySlug(slug: string) {
  return (await transit()).findOne({ slug });
}

export async function relatedTransit(slug: string, type: TransitType, n = 3) {
  const col = await transit();
  return col.find({ slug: { $ne: slug }, type, active: true }).sort({ name: 1 }).limit(n).toArray();
}

// ---- Admin CRUD ----
export type TransitInput = {
  name: string; type: TransitType;
  origin: string; destination: string; stops?: string[];
  operator?: string; phone?: string; fare?: string;
  frequency?: string; duration?: string; distance?: string; note?: string;
  verified?: boolean; active?: boolean;
  seo?: SeoFields;
};

export async function createTransit(input: TransitInput) {
  const col = await transit();
  const now = new Date();
  const slug = await uniqueSlug(col, slugify(input.name), "tuyen-xe");
  const doc: TransitDoc = {
    slug, name: input.name.trim(), type: input.type, typeLabel: typeLabel(input.type),
    origin: input.origin, destination: input.destination, stops: input.stops ?? [],
    operator: input.operator, phone: input.phone, fare: input.fare,
    frequency: input.frequency, duration: input.duration, distance: input.distance, note: input.note,
    seo: input.seo,
    verified: input.verified ?? false, active: input.active ?? true, createdAt: now, updatedAt: now,
  };
  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}

export async function updateTransit(slug: string, patch: Partial<TransitInput>) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
  if (patch.name) set.name = patch.name.trim();
  if (patch.type) set.typeLabel = typeLabel(patch.type);
  const res = await (await transit()).updateOne({ slug }, { $set: set });
  return res.matchedCount;
}

export async function deleteTransit(slug: string) {
  const res = await (await transit()).deleteOne({ slug });
  return res.deletedCount;
}

// Bản ghi phẳng cho client (admin). Import type-only ở client → không kéo mongodb vào bundle.
export type TransitRow = TransitInput & { slug: string };
export function toTransitRow(d: TransitDoc): TransitRow {
  return {
    slug: d.slug, name: d.name, type: d.type,
    origin: d.origin, destination: d.destination, stops: d.stops,
    operator: d.operator, phone: d.phone, fare: d.fare,
    frequency: d.frequency, duration: d.duration, distance: d.distance, note: d.note,
    seo: d.seo,
    verified: d.verified, active: d.active,
  };
}

export async function countByType(): Promise<Record<TransitType, number>> {
  const col = await transit();
  const rows = await col.aggregate<{ _id: TransitType; n: number }>([{ $group: { _id: "$type", n: { $sum: 1 } } }]).toArray();
  const out = { "lien-tinh": 0, "noi-tinh": 0, "xe-buyt": 0 } as Record<TransitType, number>;
  for (const r of rows) out[r._id] = r.n;
  return out;
}
