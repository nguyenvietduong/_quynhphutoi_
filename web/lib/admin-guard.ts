// Guard dùng chung cho API admin. Trả về { user } nếu hợp lệ, hoặc NextResponse lỗi
// (401 chưa đăng nhập / 403 không phải admin) để route return thẳng.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin";
import { isAdmin, isStaff, type UserDoc } from "@/lib/users";
import { getRolePermissions, hasPerm, type ModuleKey, type PermLevel } from "@/lib/role-permissions";

export async function requireAdmin(): Promise<{ user: UserDoc } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Chỉ admin." }, { status: 403 });
  return { user };
}

// Guard cho API nội dung + kiểm duyệt: cho cả admin và editor (biên tập viên).
export async function requireStaff(): Promise<{ user: UserDoc } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  if (!isStaff(user)) return NextResponse.json({ error: "Chỉ admin hoặc biên tập viên." }, { status: 403 });
  return { user };
}

// Guard theo module: kiểm tra người dùng có quyền tối thiểu cho module đó không.
// Admin luôn full; editor tra cứu config DB.
export async function requirePerm(
  module: ModuleKey,
  minLevel: PermLevel,
): Promise<{ user: UserDoc; perm: PermLevel } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  if (!isStaff(user)) return NextResponse.json({ error: "Chỉ admin hoặc biên tập viên." }, { status: 403 });
  if (isAdmin(user)) return { user, perm: "full" };

  const config = await getRolePermissions();
  const rolePerms = user.role === "editor" ? config.editor : config.user;
  const perm: PermLevel = rolePerms[module] ?? "none";
  if (!hasPerm(perm, minLevel)) {
    return NextResponse.json({ error: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
  }
  return { user, perm };
}

// Dành cho server page: lấy mức quyền của user hiện tại cho module.
// Admin → "full"; không phải staff → null (layout đã redirect trước).
export async function getModulePerm(module: ModuleKey): Promise<PermLevel | null> {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return null;
  if (isAdmin(user)) return "full";
  const config = await getRolePermissions();
  const rolePerms = user.role === "editor" ? config.editor : config.user;
  return rolePerms[module] ?? "none";
}
