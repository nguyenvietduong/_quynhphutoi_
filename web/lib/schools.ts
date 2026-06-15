// Trường học trên địa bàn huyện Quỳnh Phụ — schema chuyên nghiệp, đủ trường cho
// một danh bạ giáo dục: định danh, cấp học, loại hình, địa chỉ hành chính, liên hệ
// và toạ độ. `level` khớp slug danh mục dưới "Dịch vụ công > Trường học"
// (mam-non | tieu-hoc | thcs | thpt) — xem lib/categories.ts.

import { getDb, ensureIndexes } from "@/lib/db";
import { type Filter } from "mongodb";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { SeoFields } from "@/lib/seo-fields";

export type SchoolLevel = "mam-non" | "tieu-hoc" | "thcs" | "thpt";
// gdnn-gdtx: Trung tâm Giáo dục nghề nghiệp – Giáo dục thường xuyên (dạy văn hoá cấp 3).
export type SchoolType = "cong-lap" | "tu-thuc" | "dan-lap" | "gdnn-gdtx";

// Bậc học — nhãn + thứ tự hiển thị (đồng bộ với category truong-hoc).
export const SCHOOL_LEVELS: { slug: SchoolLevel; label: string; order: number }[] = [
  { slug: "mam-non", label: "Mầm non", order: 1 },
  { slug: "tieu-hoc", label: "Tiểu học", order: 2 },
  { slug: "thcs", label: "Trung học cơ sở", order: 3 },
  { slug: "thpt", label: "Trung học phổ thông", order: 4 },
];
export const levelLabel = (l: SchoolLevel) =>
  SCHOOL_LEVELS.find((x) => x.slug === l)?.label ?? l;

export type SchoolDoc = {
  _id?: import("mongodb").ObjectId;
  slug: string;            // duy nhất, vd "thpt-quynh-coi", "thcs-an-ap"
  name: string;            // "Trường THPT Quỳnh Côi"
  shortName?: string;
  level: SchoolLevel;      // bậc cao nhất (để hiển thị/sắp xếp)
  levels: SchoolLevel[];   // mọi bậc trường giảng dạy — trường liên cấp TH&THCS có 2 bậc
  levelLabel: string;      // nhãn bậc học (denormalize cho tiện hiển thị)
  type: SchoolType;

  verified: boolean;       // true: có nguồn xác minh; false: suy theo quy ước, cần kiểm chứng
  sourceUrl?: string;      // nguồn tham chiếu (nếu có)

  // Địa chỉ — CHUẨN HÓA: chỉ lưu khóa ngoại wardSlug → bảng admin_units
  // (tên xã / huyện / tỉnh / xã mới nằm ở đó, KHÔNG lưu trùng tại đây).
  wardSlug: string;        // FK → admin_units.slug, vd "quynh-coi"
  address?: string;        // chi tiết đường/khu/thôn (riêng từng trường, tùy chọn)

  // Liên hệ
  phone?: string;
  email?: string;
  website?: string;
  principal?: string;      // hiệu trưởng

  // Thông tin thêm
  foundedYear?: number;
  description?: string;
  coords?: { lat: number; lng: number };
  seo?: SeoFields;         // ghi đè SEO trang chi tiết (tuỳ chọn)

  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function schools() {
  const db = await getDb();
  const col = db.collection<SchoolDoc>("schools");
  await ensureIndexes("schools", () => Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ level: 1, wardSlug: 1 }),
    col.createIndex({ wardSlug: 1, level: 1 }),
    col.createIndex({ name: "text" }, { default_language: "none" }),
  ]));
  return col;
}

export type SchoolListOpts = {
  level?: SchoolLevel;
  ward?: string;            // theo wardSlug (xã cũ)
  wards?: string[];         // nhiều wardSlug (vd lọc theo xã mới → các xã cũ thành viên)
  type?: SchoolType;
  search?: string;
  activeOnly?: boolean;
  limit?: number;
  skip?: number;
};

export async function listSchools(opts: SchoolListOpts = {}) {
  const col = await schools();
  const filter: Filter<SchoolDoc> = {};
  if (opts.level) filter.levels = opts.level;   // khớp cả trường liên cấp
  if (opts.ward) filter.wardSlug = opts.ward;
  if (opts.wards?.length) filter.wardSlug = { $in: opts.wards };
  if (opts.type) filter.type = opts.type;
  if (opts.activeOnly) filter.active = true;
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };

  const cursor = col.find(filter).sort({ level: 1, ward: 1, name: 1 });
  if (opts.skip) cursor.skip(opts.skip);
  if (opts.limit) cursor.limit(opts.limit);
  return cursor.toArray();
}

export async function getSchoolBySlug(slug: string) {
  return (await schools()).findOne({ slug });
}

export async function listByWard(wardSlug: string) {
  return (await schools()).find({ wardSlug }).sort({ level: 1, name: 1 }).toArray();
}

// ---- Admin CRUD ----
export type SchoolInput = {
  name: string; shortName?: string;
  level: SchoolLevel; levels?: SchoolLevel[]; type: SchoolType;
  wardSlug: string; address?: string;
  phone?: string; email?: string; website?: string; principal?: string;
  foundedYear?: number; description?: string;
  verified?: boolean; active?: boolean; sourceUrl?: string;
  seo?: SeoFields;
};

export async function createSchool(input: SchoolInput) {
  const col = await schools();
  const now = new Date();
  const levels = input.levels?.length ? input.levels : [input.level];
  const slug = await uniqueSlug(col, slugify(input.name), "truong-hoc");
  const doc: SchoolDoc = {
    slug, name: input.name.trim(), shortName: input.shortName?.trim() || undefined,
    level: input.level, levels, levelLabel: levelLabel(input.level), type: input.type,
    verified: input.verified ?? false, sourceUrl: input.sourceUrl,
    wardSlug: input.wardSlug, address: input.address,
    phone: input.phone, email: input.email, website: input.website, principal: input.principal,
    foundedYear: input.foundedYear, description: input.description, seo: input.seo,
    active: input.active ?? true, createdAt: now, updatedAt: now,
  };
  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}

export async function updateSchool(slug: string, patch: Partial<SchoolInput>) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
  if (patch.name) set.name = patch.name.trim();
  if (patch.level) {
    set.levelLabel = levelLabel(patch.level);
    if (!patch.levels?.length) set.levels = [patch.level];
  }
  const res = await (await schools()).updateOne({ slug }, { $set: set });
  return res.matchedCount;
}

export async function deleteSchool(slug: string) {
  const res = await (await schools()).deleteOne({ slug });
  return res.deletedCount;
}

// Bản ghi phẳng cho client (admin). Import type-only ở client → không kéo mongodb vào bundle.
export type SchoolRow = SchoolInput & { slug: string; verified: boolean; active: boolean };
export function toSchoolRow(d: SchoolDoc): SchoolRow {
  return {
    slug: d.slug, name: d.name, shortName: d.shortName, level: d.level, levels: d.levels, type: d.type,
    wardSlug: d.wardSlug, address: d.address, phone: d.phone, email: d.email, website: d.website,
    principal: d.principal, foundedYear: d.foundedYear, description: d.description, sourceUrl: d.sourceUrl,
    verified: d.verified, active: d.active, seo: d.seo,
  };
}

// Đếm số trường theo từng bậc học (cho thẻ thống kê / bộ lọc).
export async function countByLevel(): Promise<Record<SchoolLevel, number>> {
  const col = await schools();
  const rows = await col
    .aggregate<{ _id: SchoolLevel; n: number }>([
      { $unwind: "$levels" },
      { $group: { _id: "$levels", n: { $sum: 1 } } },
    ])
    .toArray();
  const out = { "mam-non": 0, "tieu-hoc": 0, thcs: 0, thpt: 0 } as Record<SchoolLevel, number>;
  for (const r of rows) out[r._id] = r.n;
  return out;
}
