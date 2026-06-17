// Danh mục phân cấp (cây nhiều bậc) dùng chung cho nhiều phân hệ:
// dịch vụ công, tiện ích, tìm đồ rơi… Mỗi phân hệ là 1 "module" (namespace).
//
// Mô hình lưu trữ: Materialized Path + Ancestors
//   - path      : đường dẫn slug từ gốc, vd "/giay-to/cccd"  → truy vấn nhanh theo nhánh
//   - ancestors : mảng _id tổ tiên (gốc → cha)              → lấy cả cây con bằng 1 query
//   - depth     : bậc, gốc = 0                               → biết đang ở cấp mấy
// => Đọc cây / breadcrumb / cây con đều O(1) query, không đệ quy DB.

import { getDb, ensureIndexes } from "@/lib/db";
import { ObjectId, type Filter } from "mongodb";

export type CategoryDoc = {
  _id?: ObjectId;
  module: string;         // phân hệ: "dich-vu-cong" | "tien-ich" | "tim-do-roi" …
  slug: string;           // định danh trong 1 bậc (duy nhất theo module + cha)
  name: string;           // tên hiển thị
  parentId: ObjectId | null;
  path: string;           // materialized path, vd "/giay-to/cccd"
  ancestors: ObjectId[];  // _id tổ tiên: gốc → cha
  depth: number;          // bậc — gốc = 0
  order: number;          // thứ tự trong nhóm anh em
  icon?: string;
  href?: string;          // liên kết tới trang (khớp dữ liệu navbar), nếu có
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Cây lồng nhau để trả ra UI (mỗi node kèm danh sách con).
export type CategoryNode = CategoryDoc & { children: CategoryNode[] };

export type CreateCategoryInput = {
  module: string;
  slug: string;
  name: string;
  parentId?: ObjectId | string | null;
  order?: number;
  icon?: string;
  href?: string;
  description?: string;
  active?: boolean;
};

const toId = (v: ObjectId | string | null | undefined): ObjectId | null =>
  v == null ? null : typeof v === "string" ? new ObjectId(v) : v;

export async function categories() {
  const db = await getDb();
  const col = db.collection<CategoryDoc>("categories");
  await ensureIndexes("categories", () => Promise.all([
    // Không trùng đường dẫn trong cùng 1 phân hệ.
    col.createIndex({ module: 1, path: 1 }, { unique: true }),
    // Liệt kê con theo thứ tự.
    col.createIndex({ module: 1, parentId: 1, order: 1 }),
    // Lấy cả cây con: { ancestors: <id> }.
    col.createIndex({ ancestors: 1 }),
  ]));
  return col;
}

// Tạo danh mục — tự suy ra path / ancestors / depth từ cha.
export async function createCategory(input: CreateCategoryInput) {
  const col = await categories();
  const parentId = toId(input.parentId);

  let parent: CategoryDoc | null = null;
  if (parentId) {
    parent = await col.findOne({ _id: parentId });
    if (!parent) throw new Error(`Không tìm thấy danh mục cha: ${parentId.toString()}`);
    if (parent.module !== input.module) {
      throw new Error("Danh mục con phải cùng module với cha.");
    }
  }

  const now = new Date();
  const doc: CategoryDoc = {
    module: input.module,
    slug: input.slug,
    name: input.name,
    parentId,
    path: `${parent ? parent.path : ""}/${input.slug}`,
    ancestors: parent ? [...parent.ancestors, parent._id!] : [],
    depth: parent ? parent.depth + 1 : 0,
    order: input.order ?? 0,
    icon: input.icon,
    href: input.href,
    description: input.description,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}

// Tạo / cập nhật theo (module, path) — idempotent, dùng cho seed & import.
export async function upsertCategory(input: CreateCategoryInput) {
  const col = await categories();
  const parentId = toId(input.parentId);
  const parent = parentId ? await col.findOne({ _id: parentId }) : null;
  if (parentId && !parent) throw new Error(`Không tìm thấy danh mục cha: ${parentId.toString()}`);

  const path = `${parent ? parent.path : ""}/${input.slug}`;
  const now = new Date();

  const res = await col.findOneAndUpdate(
    { module: input.module, path },
    {
      $set: {
        name: input.name,
        parentId,
        ancestors: parent ? [...parent.ancestors, parent._id!] : [],
        depth: parent ? parent.depth + 1 : 0,
        order: input.order ?? 0,
        icon: input.icon,
        href: input.href,
        description: input.description,
        active: input.active ?? true,
        updatedAt: now,
      },
      $setOnInsert: { module: input.module, slug: input.slug, path, createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
  return res!;
}

// ---- Admin: sửa / xoá ----
// Chỉ cho sửa thuộc tính hiển thị (không đổi slug/path/parent để tránh phải tính lại cây).
export type CategoryPatch = Partial<{ name: string; order: number; icon: string; href: string; description: string; active: boolean }>;

export async function updateCategory(id: ObjectId | string, patch: CategoryPatch) {
  const _id = toId(id);
  if (!_id) return 0;
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
  const res = await (await categories()).updateOne({ _id }, { $set: set });
  return res.matchedCount;
}

// Xoá danh mục. Chặn nếu còn con (yêu cầu xoá/di chuyển con trước).
export async function deleteCategory(id: ObjectId | string): Promise<{ ok: boolean; reason?: "not-found" | "has-children" }> {
  const _id = toId(id);
  if (!_id) return { ok: false, reason: "not-found" };
  const col = await categories();
  const node = await col.findOne({ _id });
  if (!node) return { ok: false, reason: "not-found" };
  const childCount = await col.countDocuments({ parentId: _id });
  if (childCount > 0) return { ok: false, reason: "has-children" };
  await col.deleteOne({ _id });
  return { ok: true };
}

// Danh sách module (phân hệ) đang có danh mục.
export async function listModules(): Promise<string[]> {
  const col = await categories();
  return (await col.distinct("module")).sort();
}

// Danh sách con trực tiếp của 1 node (parentId = null → các node gốc).
export async function listChildren(module: string, parentId: ObjectId | string | null = null) {
  const col = await categories();
  return col.find({ module, parentId: toId(parentId) }).sort({ order: 1, name: 1 }).toArray();
}

// Lấy toàn bộ danh mục của 1 phân hệ, dựng thành cây lồng nhau.
export async function getTree(module: string, opts: { activeOnly?: boolean } = {}) {
  const col = await categories();
  const filter: Filter<CategoryDoc> = { module };
  if (opts.activeOnly) filter.active = true;
  const flat = await col.find(filter).sort({ depth: 1, order: 1, name: 1 }).toArray();
  return buildTree(flat);
}

// Dựng cây lồng nhau từ danh sách phẳng (không đụng DB).
export function buildTree(flat: CategoryDoc[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of flat) byId.set(c._id!.toString(), { ...c, children: [] });

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const pid = node.parentId?.toString();
    const parent = pid ? byId.get(pid) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "vi"));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

// Danh sách phẳng {slug, name} các danh mục ĐANG bật của 1 module (theo order),
// dùng cho dropdown/lọc ở mọi phân hệ (danh mục phẳng, không phân cấp).
export async function listActiveCategoryOptions(module: string): Promise<{ slug: string; name: string }[]> {
  const col = await categories();
  const rows = await col.find({ module, active: true }).sort({ order: 1, name: 1 }).toArray();
  return rows.map((c) => ({ slug: c.slug, name: c.name }));
}

// Map slug → name MỌI danh mục của 1 module (kể cả đang ẩn) — để hiển thị nhãn
// của bản ghi cũ dù danh mục sau này bị ẩn. Fallback hiển thị = chính slug.
export async function categoryLabelMap(module: string): Promise<Record<string, string>> {
  const col = await categories();
  const rows = await col.find({ module }).sort({ order: 1, name: 1 }).toArray();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.slug] = r.name;
  return map;
}

// Nhãn hiển thị của 1 slug trong module — đọc thẳng DB (dùng khi tạo/sửa để
// denormalize label vào bản ghi). Không tìm thấy → trả lại chính slug.
export async function categoryName(module: string, slug: string): Promise<string> {
  if (!slug) return slug;
  const cat = await (await categories()).findOne({ module, slug });
  return cat?.name || slug;
}

export async function getByPath(module: string, path: string) {
  const col = await categories();
  return col.findOne({ module, path: path.startsWith("/") ? path : `/${path}` });
}

// Breadcrumb: gốc → … → chính nó.
export async function breadcrumb(category: CategoryDoc) {
  const col = await categories();
  const ancestors = await col.find({ _id: { $in: category.ancestors } }).toArray();
  ancestors.sort((a, b) => a.depth - b.depth);
  return [...ancestors, category];
}

// Toàn bộ cây con (mọi cấp) bên dưới 1 node.
export async function getDescendants(category: CategoryDoc) {
  const col = await categories();
  return col.find({ module: category.module, ancestors: category._id! }).sort({ depth: 1, order: 1 }).toArray();
}
