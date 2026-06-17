// Admin: cập nhật (PATCH) & xoá (DELETE) một di tích.
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { updateRelic, deleteRelic, type RelicInput } from "@/lib/relics";
import { listActiveCategoryOptions } from "@/lib/categories";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { WARDS } from "@/lib/wards";

const WARD_SET = new Set(WARDS.map((w) => w.slug));
const slugSet = async (module: string) => new Set((await listActiveCategoryOptions(module)).map((o) => o.slug));

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requireStaff();
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const b = await req.json().catch(() => ({}));

  const patch: Partial<RelicInput> = {};
  for (const k of ["name", "wardSlug", "address", "description", "era", "worship", "festival"] as const)
    if (typeof b[k] === "string") patch[k] = b[k];
  if (b.wardSlug !== undefined && !WARD_SET.has(String(b.wardSlug)))
    return NextResponse.json({ error: "Xã/thị trấn không hợp lệ." }, { status: 400 });
  if (b.type !== undefined) { if (!(await slugSet("di-tich")).has(String(b.type))) return NextResponse.json({ error: "Loại di tích không hợp lệ." }, { status: 400 }); patch.type = b.type; }
  if (b.ranking !== undefined && b.ranking !== "") { if (!(await slugSet("xep-hang-di-tich")).has(String(b.ranking))) return NextResponse.json({ error: "Xếp hạng không hợp lệ." }, { status: 400 }); patch.ranking = b.ranking; }
  if (b.recognizedYear !== undefined) patch.recognizedYear = b.recognizedYear ? Number(b.recognizedYear) : undefined;
  if (Array.isArray(b.images)) patch.images = (b.images as unknown[]).map(String);
  if (typeof b.verified === "boolean") patch.verified = b.verified;
  if (typeof b.featured === "boolean") patch.featured = b.featured;
  if (typeof b.active === "boolean") patch.active = b.active;
  if ("seo" in b) patch.seo = sanitizeSeoFields(b.seo);

  const n = await updateRelic(slug, patch);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requireStaff();
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const n = await deleteRelic(slug);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
