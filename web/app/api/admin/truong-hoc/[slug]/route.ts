// Admin: cập nhật (PATCH) & xoá (DELETE) một trường học.
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { updateSchool, deleteSchool, type SchoolInput } from "@/lib/schools";
import { listActiveCategoryOptions } from "@/lib/categories";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { WARDS } from "@/lib/wards";

const WARD_SET = new Set(WARDS.map((w) => w.slug));

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requireStaff();
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const b = await req.json().catch(() => ({}));

  const [levelCats, typeCats] = await Promise.all([
    listActiveCategoryOptions("truong-hoc"),
    listActiveCategoryOptions("loai-hinh-truong"),
  ]);
  const LEVELS = new Set(levelCats.map((c) => c.slug));
  const TYPES = new Set(typeCats.map((c) => c.slug));

  const patch: Partial<SchoolInput> = {};
  if (typeof b.name === "string") patch.name = b.name;
  if (typeof b.shortName === "string") patch.shortName = b.shortName;
  if (b.level !== undefined) { if (!LEVELS.has(b.level)) return NextResponse.json({ error: "Cấp học không hợp lệ." }, { status: 400 }); patch.level = b.level; }
  if (Array.isArray(b.levels)) patch.levels = (b.levels as string[]).filter((l) => LEVELS.has(l));
  if (b.type !== undefined) { if (!TYPES.has(b.type)) return NextResponse.json({ error: "Loại hình không hợp lệ." }, { status: 400 }); patch.type = b.type; }
  if (b.wardSlug !== undefined) { if (!WARD_SET.has(String(b.wardSlug))) return NextResponse.json({ error: "Xã/thị trấn không hợp lệ." }, { status: 400 }); patch.wardSlug = b.wardSlug; }
  for (const k of ["address", "phone", "email", "website", "principal", "description", "sourceUrl", "image"] as const)
    if (typeof b[k] === "string") patch[k] = b[k];
  if (b.foundedYear !== undefined) patch.foundedYear = b.foundedYear ? Number(b.foundedYear) : undefined;
  if (typeof b.verified === "boolean") patch.verified = b.verified;
  if (typeof b.active === "boolean") patch.active = b.active;
  if ("seo" in b) patch.seo = sanitizeSeoFields(b.seo);

  const n = await updateSchool(slug, patch);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requireStaff();
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const n = await deleteSchool(slug);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
