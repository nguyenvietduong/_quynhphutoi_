// Tìm đồ rơi — bài đăng "tìm đồ" (người mất) & "nhặt được" (người nhặt).
// Theo pattern repo: mongodb native driver, helper gói gọn trong file này.
//
// QUAN HỆ:
//   - categoryId  → collection "categories" (module "tim-do-roi"), xem lib/categories.ts.
//     Lưu kèm categorySlug / categoryName / categoryPath (denormalize) để hiển thị
//     & lọc nhanh không phải join. _id vẫn là nguồn chuẩn khi cần cây con.
//   - postedBy    → collection "users" (lib/users.ts). BẮT BUỘC phải đăng nhập mới
//     đăng được; lưu kèm postedByName (snapshot) để khỏi join khi liệt kê.
//
// VÒNG ĐỜI (status):
//   open      — đang mở (đang tìm / đang giữ chờ trả)
//   matched   — đã có người liên hệ khớp, đang xác minh
//   resolved  — đã trả / đã tìm thấy (đóng thành công)
//   closed    — người đăng tự đóng / hết hạn
//
// KIỂM DUYỆT (approved): cổng công khai nên tin chờ admin duyệt mới hiện public.

import { getDb, ensureIndexes } from "@/lib/db";
import { categories, type CategoryDoc } from "@/lib/categories";
import { ObjectId, type Filter } from "mongodb";
import type { SeoFields } from "@/lib/seo-fields";

export const LOSTFOUND_MODULE = "tim-do-roi";

// "tim-do"   = người MẤT đăng tin tìm lại đồ.
// "nhat-duoc"= người NHẶT ĐƯỢC đăng tin để trả lại.
export type LostFoundKind = "tim-do" | "nhat-duoc";
export type LostFoundStatus = "open" | "matched" | "resolved" | "closed";

export type LostFoundContact = {
  name: string;
  phone: string;
  email?: string;
  hidePhone?: boolean;   // ẩn SĐT public, chỉ hiện khi đăng nhập / qua nút liên hệ
};

export type LostFoundLocation = {
  wardSlug: string;      // FK → admin_units.slug (tên xã/huyện/tỉnh + xã mới nằm ở đó)
  address?: string;      // mô tả vị trí cụ thể (đường/thôn) — tùy chọn
  mapUrl?: string;       // link Google Maps (đã resolve link rút gọn) — tùy chọn
};

export type LostFoundDoc = {
  _id?: ObjectId;
  kind: LostFoundKind;
  slug: string;                 // định danh trên URL (duy nhất)
  title: string;
  description: string;

  // ── Tham chiếu danh mục (categories, module "tim-do-roi") ──
  categoryId: ObjectId;
  categorySlug: string;         // denormalize: slug bậc của danh mục
  categoryName: string;         // denormalize: tên hiển thị
  categoryPath: string;         // denormalize: materialized path, vd "/giay-to/cccd"

  images: string[];             // ảnh minh hoạ món đồ
  location: LostFoundLocation;
  occurredAt: Date;             // thời điểm mất / nhặt được
  contact: LostFoundContact;
  reward?: string;              // hậu tạ (thường cho tin "tim-do")
  seo?: SeoFields;              // ghi đè SEO trang chi tiết (admin, tuỳ chọn)

  // ── Người đăng (users) ──
  postedBy: ObjectId;
  postedByName: string;         // snapshot tên người đăng

  status: LostFoundStatus;
  approved: boolean;            // admin đã duyệt cho hiện public chưa
  approvedBy?: string; approvedByName?: string; approvedAt?: Date;
  verified: boolean;            // đã xác minh (admin / liên hệ thành công)
  featured: boolean;
  views: number;
  active: boolean;

  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
};

const toId = (v: ObjectId | string): ObjectId =>
  typeof v === "string" ? new ObjectId(v) : v;

export function slugify(s: string) {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-");
}

// ---- Collection + index ----
export async function lostFound() {
  const db = await getDb();
  const col = db.collection<LostFoundDoc>("lost_found");
  await ensureIndexes("lost_found", () => Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    // Trang danh sách: lọc theo loại + danh mục + trạng thái, mới nhất.
    col.createIndex({ kind: 1, categorySlug: 1, status: 1, createdAt: -1 }),
    // Lọc theo xã.
    col.createIndex({ "location.wardSlug": 1, createdAt: -1 }),
    // Tin của tôi.
    col.createIndex({ postedBy: 1, createdAt: -1 }),
    // Lấy mọi tin theo nhánh danh mục (đường dẫn).
    col.createIndex({ categoryPath: 1 }),
    // Tìm kiếm tiếng Việt cơ bản.
    col.createIndex(
      { title: "text", description: "text" },
      { default_language: "none" },
    ),
  ]));
  return col;
}

// ---- Tạo bài đăng (yêu cầu đã đăng nhập → truyền user từ getSession) ----
export type CreateLostFoundInput = {
  kind: LostFoundKind;
  title: string;
  description: string;
  categoryId: ObjectId | string;     // _id trong collection categories
  images?: string[];
  location: LostFoundLocation;
  occurredAt: Date;
  contact: LostFoundContact;
  reward?: string;
  slug?: string;                      // tự sinh từ title nếu bỏ trống
  approved?: boolean;                 // mặc định false (chờ duyệt)
};

export async function createPost(
  poster: { id: string; name: string },
  input: CreateLostFoundInput,
) {
  const col = await lostFound();

  // Lấy danh mục để denormalize + đảm bảo đúng module "tim-do-roi".
  const cat = await (await categories()).findOne({ _id: toId(input.categoryId) });
  if (!cat) throw new Error(`Không tìm thấy danh mục: ${String(input.categoryId)}`);
  if (cat.module !== LOSTFOUND_MODULE) {
    throw new Error(`Danh mục phải thuộc module "${LOSTFOUND_MODULE}".`);
  }

  const now = new Date();
  const slug = await uniqueSlug(col, input.slug || slugify(input.title));

  const doc: LostFoundDoc = {
    kind: input.kind,
    slug,
    title: input.title.trim(),
    description: input.description.trim(),
    categoryId: cat._id!,
    categorySlug: cat.slug,
    categoryName: cat.name,
    categoryPath: cat.path,
    images: input.images ?? [],
    location: input.location,
    occurredAt: input.occurredAt,
    contact: input.contact,
    reward: input.reward,
    postedBy: new ObjectId(poster.id),
    postedByName: poster.name,
    status: "open",
    approved: input.approved ?? false,   // chờ admin duyệt (trừ khi tắt duyệt)
    verified: false,
    featured: false,
    views: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  };

  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}

// Sinh slug duy nhất (thêm -2, -3… nếu trùng).
async function uniqueSlug(
  col: import("mongodb").Collection<LostFoundDoc>,
  base: string,
) {
  const root = base || "tin";
  let slug = root;
  let i = 2;
  while (await col.findOne({ slug })) slug = `${root}-${i++}`;
  return slug;
}

// ---- Truy vấn ----
export async function getPostBySlug(slug: string) {
  return (await lostFound()).findOne({ slug });
}

export type ListLostFoundOpts = {
  kind?: LostFoundKind;
  categorySlug?: string;
  categoryPath?: string;       // lọc cả nhánh con: dùng tiền tố path
  wardSlug?: string;
  status?: LostFoundStatus;
  search?: string;
  approvedOnly?: boolean;      // public: chỉ tin đã duyệt + active (mặc định true)
  approved?: boolean;          // admin: lọc rõ theo cờ duyệt (vd false = chờ duyệt)
  limit?: number;
  skip?: number;
};

function buildFilter(opts: ListLostFoundOpts): Filter<LostFoundDoc> {
  const filter: Filter<LostFoundDoc> = {};
  if (opts.approvedOnly !== false) {
    filter.approved = true;
    filter.active = true;
  }
  if (typeof opts.approved === "boolean") filter.approved = opts.approved;
  if (opts.kind) filter.kind = opts.kind;
  if (opts.categorySlug) filter.categorySlug = opts.categorySlug;
  if (opts.categoryPath) {
    // Khớp chính nó + mọi nhánh con (path bắt đầu bằng tiền tố).
    filter.categoryPath = { $regex: `^${escapeRegex(opts.categoryPath)}(/|$)` };
  }
  if (opts.wardSlug) filter["location.wardSlug"] = opts.wardSlug;
  if (opts.status) filter.status = opts.status;
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };
  return filter;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listPosts(opts: ListLostFoundOpts = {}) {
  const col = await lostFound();
  const cursor = col.find(buildFilter(opts)).sort({ createdAt: -1 });
  if (opts.skip) cursor.skip(opts.skip);
  if (opts.limit) cursor.limit(opts.limit);
  return cursor.toArray();
}

export async function countPosts(opts: ListLostFoundOpts = {}) {
  const col = await lostFound();
  return col.countDocuments(buildFilter(opts));
}

// Tin của 1 người dùng (gồm cả tin chưa duyệt — để họ tự quản lý).
export async function listMyPosts(userId: ObjectId | string) {
  const col = await lostFound();
  return col.find({ postedBy: toId(userId) }).sort({ createdAt: -1 }).toArray();
}

// Tin đang chờ admin duyệt (approved=false, còn active) — cũ nhất trước để xử lý FIFO.
export async function listPending(opts: { limit?: number } = {}) {
  const col = await lostFound();
  const cur = col.find({ approved: false, active: true }).sort({ createdAt: 1 });
  if (opts.limit) cur.limit(opts.limit);
  return cur.toArray();
}

export async function countPending() {
  const col = await lostFound();
  return col.countDocuments({ approved: false, active: true });
}

// Xoá hẳn 1 tin (admin từ chối). Trả số bản ghi đã xoá.
export async function deletePost(slug: string) {
  const res = await (await lostFound()).deleteOne({ slug });
  return res.deletedCount;
}

// Tin liên quan: cùng danh mục, ưu tiên cùng loại, mới nhất.
export async function relatedPosts(slug: string, n = 4) {
  const col = await lostFound();
  const cur = await col.findOne({ slug });
  if (!cur) return [];
  return col
    .find({
      slug: { $ne: slug },
      categorySlug: cur.categorySlug,
      approved: true,
      active: true,
    })
    .sort({ kind: cur.kind === "tim-do" ? 1 : -1, createdAt: -1 })
    .limit(n)
    .toArray();
}

// ---- Cập nhật trạng thái ----
export async function incrementViews(slug: string) {
  await (await lostFound()).updateOne({ slug }, { $inc: { views: 1 } });
}

// Đánh dấu đã trả / đã tìm thấy (đóng thành công).
export async function markResolved(slug: string) {
  const now = new Date();
  await (await lostFound()).updateOne(
    { slug },
    { $set: { status: "resolved", resolvedAt: now, updatedAt: now } },
  );
}

// Admin duyệt cho hiện public.
export async function approvePost(slug: string, approved = true, by?: { id: string; name: string }) {
  const now = new Date();
  const set: Record<string, unknown> = { approved, updatedAt: now };
  if (approved && by) { set.approvedBy = by.id; set.approvedByName = by.name; set.approvedAt = now; }
  if (!approved) { set.approvedBy = null; set.approvedByName = null; set.approvedAt = null; }
  await (await lostFound()).updateOne({ slug }, { $set: set });
}

// Admin sửa nội dung tin (description đã sanitize ở tầng route).
export type LostFoundPatch = Partial<{ title: string; description: string; reward: string; featured: boolean; approved: boolean; status: LostFoundStatus; images: string[]; seo: SeoFields }>
  & { "location.address"?: string; "location.mapUrl"?: string };
export async function updatePost(slug: string, patch: LostFoundPatch) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
  if (patch.title) set.title = patch.title.trim();
  const res = await (await lostFound()).updateOne({ slug }, { $set: set });
  return res.matchedCount;
}

// Tiện ích: lấy node danh mục đầy đủ từ 1 bài (khi cần breadcrumb / cây con).
export async function categoryOf(post: LostFoundDoc): Promise<CategoryDoc | null> {
  return (await categories()).findOne({ _id: post.categoryId });
}
