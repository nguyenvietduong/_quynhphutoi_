// Admin: đổi vai trò / xác minh (PATCH) & xoá (DELETE) người dùng.
// An toàn: không cho tự gỡ quyền admin của chính mình, không cho tự xoá.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { setUserRole, setUserVerified, setBanned, addWarning, clearWarnings, deleteUser, findById } from "@/lib/users";

const SUPERADMIN_EMAIL = "duongnv10504@gmail.com";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const isSelf = g.user._id!.toString() === id;

  const target = await findById(id);
  if (!target) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  if (target.email === SUPERADMIN_EMAIL) return NextResponse.json({ error: "Tài khoản này được bảo vệ, không thể chỉnh sửa." }, { status: 403 });

  if (b.role !== undefined) {
    if (!["admin", "editor", "user"].includes(b.role)) return NextResponse.json({ error: "Vai trò không hợp lệ." }, { status: 400 });
    if (isSelf && b.role !== "admin") return NextResponse.json({ error: "Không thể tự gỡ quyền admin của chính mình." }, { status: 400 });
    if (!isSelf && target.role === "admin") return NextResponse.json({ error: "Không thể đổi quyền của tài khoản admin khác." }, { status: 403 });
    const n = await setUserRole(id, b.role);
    if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }
  if (typeof b.verified === "boolean") {
    const n = await setUserVerified(id, b.verified);
    if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }
  if (typeof b.banned === "boolean") {
    if (isSelf) return NextResponse.json({ error: "Không thể tự khóa tài khoản của mình." }, { status: 400 });
    const n = await setBanned(id, b.banned);
    if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }
  if (b.warn === "add") {
    if (isSelf) return NextResponse.json({ error: "Không thể tự cảnh báo chính mình." }, { status: 400 });
    const result = await addWarning(id);
    if (!result) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
    return NextResponse.json({ ok: true, warnCount: result.warnCount, autoBanned: result.autoBanned });
  }
  if (b.warn === "clear") {
    const u = await clearWarnings(id);
    if (!u) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
    return NextResponse.json({ ok: true, warnCount: 0 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  if (g.user._id!.toString() === id) return NextResponse.json({ error: "Không thể tự xoá tài khoản của mình." }, { status: 400 });
  const target = await findById(id);
  if (!target) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  if (target.email === SUPERADMIN_EMAIL) return NextResponse.json({ error: "Tài khoản này được bảo vệ, không thể xoá." }, { status: 403 });
  const n = await deleteUser(id);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
