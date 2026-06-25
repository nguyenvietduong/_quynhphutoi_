// Cấu hình phân quyền theo module cho từng role.
// Lưu trong MongoDB collection "role_permissions" (1 document duy nhất).
import { getDb } from "@/lib/db";
import type { PermLevel } from "@/lib/perm";
export type { PermLevel } from "@/lib/perm";
export { hasPerm } from "@/lib/perm";

// Danh sách module admin và nhãn hiển thị (theo thứ tự nhóm)
export const PERM_MODULES = [
  { key: "tin-tuc",    label: "Tin tức",            group: "Nội dung" },
  { key: "truong-hoc", label: "Trường học",          group: "Nội dung" },
  { key: "y-te",       label: "Y tế",                group: "Nội dung" },
  { key: "cho",        label: "Chợ & Mua bán",       group: "Nội dung" },
  { key: "giao-thong", label: "Giao thông",          group: "Nội dung" },
  { key: "di-tich",    label: "Di tích",             group: "Nội dung" },
  { key: "viec-lam",   label: "Việc làm",            group: "Kiểm duyệt" },
  { key: "tim-do-roi", label: "Tìm đồ rơi",          group: "Kiểm duyệt" },
  { key: "mua-ban",    label: "Mua bán",             group: "Kiểm duyệt" },
  { key: "loc-tu-ngu", label: "Lọc từ ngữ",          group: "Kiểm duyệt" },
  { key: "danh-muc",   label: "Danh mục",            group: "Dữ liệu" },
  { key: "nguoi-dung", label: "Người dùng",          group: "Hệ thống" },
  { key: "quang-cao",  label: "Quảng cáo",           group: "Hệ thống" },
  { key: "newsletter", label: "Newsletter",          group: "Hệ thống" },
  { key: "thong-bao",  label: "Gửi thông báo",       group: "Hệ thống" },
  { key: "lien-he",    label: "Liên hệ / Phản ánh",  group: "Hệ thống" },
  { key: "trang-chu",  label: "Trang chủ",           group: "Hệ thống" },
  { key: "media",      label: "Thư viện ảnh",        group: "Hệ thống" },
  { key: "affiliate",  label: "Affiliate Shopee",    group: "Hệ thống" },
  { key: "cai-dat",    label: "Cài đặt",             group: "Hệ thống" },
  { key: "hoat-dong",  label: "Nhật ký hoạt động",   group: "Hệ thống" },
] as const;

export type ModuleKey = typeof PERM_MODULES[number]["key"];

export type RolePerms = Record<ModuleKey, PermLevel>;
export type PermConfig = { editor: RolePerms; user: RolePerms };

// Admin luôn full tất cả — không lưu DB, hardcode
export const ADMIN_PERMS: RolePerms = Object.fromEntries(
  PERM_MODULES.map((m) => [m.key, "full" as PermLevel])
) as RolePerms;

export const DEFAULT_EDITOR_PERMS: RolePerms = {
  "tin-tuc":    "full",
  "truong-hoc": "edit",
  "y-te":       "edit",
  "cho":        "edit",
  "giao-thong": "edit",
  "di-tich":    "edit",
  "viec-lam":   "full",
  "tim-do-roi": "full",
  "mua-ban":    "full",
  "loc-tu-ngu": "edit",
  "danh-muc":   "edit",
  "nguoi-dung": "view",
  "quang-cao":  "none",
  "newsletter": "view",
  "thong-bao":  "none",
  "lien-he":    "view",
  "trang-chu":  "none",
  "media":      "edit",
  "affiliate":  "none",
  "cai-dat":    "none",
  "hoat-dong":  "none",
};

export const DEFAULT_USER_PERMS: RolePerms = Object.fromEntries(
  PERM_MODULES.map((m) => [m.key, "none" as PermLevel])
) as RolePerms;

export const DEFAULT_CONFIG: PermConfig = {
  editor: DEFAULT_EDITOR_PERMS,
  user:   DEFAULT_USER_PERMS,
};

async function col() {
  const db = await getDb();
  return db.collection<{ _id?: unknown; config: PermConfig }>("role_permissions");
}

export async function getRolePermissions(): Promise<PermConfig> {
  const c = await col();
  const doc = await c.findOne({});
  if (!doc) return DEFAULT_CONFIG;
  // Merge với default để đảm bảo module mới không bị thiếu
  return {
    editor: { ...DEFAULT_EDITOR_PERMS, ...doc.config.editor },
    user:   { ...DEFAULT_USER_PERMS,   ...doc.config.user   },
  };
}

export async function saveRolePermissions(config: PermConfig): Promise<void> {
  const c = await col();
  await c.updateOne({}, { $set: { config } }, { upsert: true });
}

