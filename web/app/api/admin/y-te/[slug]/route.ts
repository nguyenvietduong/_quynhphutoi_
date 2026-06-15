// Admin: cập nhật (PATCH) & xoá (DELETE) một cơ sở y tế.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { updateHealth, deleteHealth, HEALTH_TYPES, type HealthInput, type HealthType, type HealthOwnership } from "@/lib/health";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { WARDS } from "@/lib/wards";

const TYPES = HEALTH_TYPES.map((t) => t.slug) as HealthType[];
const OWNERSHIPS: HealthOwnership[] = ["cong-lap", "tu-nhan"];
const WARD_SET = new Set(WARDS.map((w) => w.slug));

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const b = await req.json().catch(() => ({}));

  const patch: Partial<HealthInput> = {};
  if (typeof b.name === "string") patch.name = b.name;
  if (typeof b.shortName === "string") patch.shortName = b.shortName;
  if (b.type !== undefined) { if (!TYPES.includes(b.type)) return NextResponse.json({ error: "Loại cơ sở không hợp lệ." }, { status: 400 }); patch.type = b.type; }
  if (b.ownership !== undefined) { if (!OWNERSHIPS.includes(b.ownership)) return NextResponse.json({ error: "Loại sở hữu không hợp lệ." }, { status: 400 }); patch.ownership = b.ownership; }
  if (b.wardSlug !== undefined) { if (!WARD_SET.has(String(b.wardSlug))) return NextResponse.json({ error: "Xã/thị trấn không hợp lệ." }, { status: 400 }); patch.wardSlug = b.wardSlug; }
  for (const k of ["address", "phone", "email", "website", "director", "hours", "specialties", "description", "sourceUrl"] as const)
    if (typeof b[k] === "string") patch[k] = b[k];
  if (b.beds !== undefined) patch.beds = b.beds ? Number(b.beds) : undefined;
  if (b.foundedYear !== undefined) patch.foundedYear = b.foundedYear ? Number(b.foundedYear) : undefined;
  if (typeof b.emergency === "boolean") patch.emergency = b.emergency;
  if (typeof b.verified === "boolean") patch.verified = b.verified;
  if (typeof b.active === "boolean") patch.active = b.active;
  if ("seo" in b) patch.seo = sanitizeSeoFields(b.seo);

  const n = await updateHealth(slug, patch);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const n = await deleteHealth(slug);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
