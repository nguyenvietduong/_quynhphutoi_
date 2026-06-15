// Admin: liệt kê (GET) & tạo (POST) cơ sở y tế.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listHealth, createHealth, toHealthRow, HEALTH_TYPES, type HealthType, type HealthOwnership } from "@/lib/health";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { WARDS } from "@/lib/wards";

const TYPES = HEALTH_TYPES.map((t) => t.slug) as HealthType[];
const OWNERSHIPS: HealthOwnership[] = ["cong-lap", "tu-nhan"];
const WARD_SET = new Set(WARDS.map((w) => w.slug));

export async function GET() {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const docs = await listHealth({});
  return NextResponse.json({ items: docs.map(toHealthRow) });
}

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));

  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "Nhập tên cơ sở." }, { status: 400 });
  if (!TYPES.includes(b.type)) return NextResponse.json({ error: "Loại cơ sở không hợp lệ." }, { status: 400 });
  if (!OWNERSHIPS.includes(b.ownership)) return NextResponse.json({ error: "Loại sở hữu không hợp lệ." }, { status: 400 });
  if (!WARD_SET.has(String(b.wardSlug))) return NextResponse.json({ error: "Chọn xã/thị trấn hợp lệ." }, { status: 400 });

  const created = await createHealth({
    name, shortName: b.shortName, type: b.type, ownership: b.ownership,
    wardSlug: b.wardSlug, address: b.address, phone: b.phone, email: b.email, website: b.website,
    director: b.director, hours: b.hours, emergency: !!b.emergency,
    beds: b.beds ? Number(b.beds) : undefined, specialties: b.specialties,
    foundedYear: b.foundedYear ? Number(b.foundedYear) : undefined,
    description: b.description, sourceUrl: b.sourceUrl,
    verified: !!b.verified, active: b.active !== false,
    seo: sanitizeSeoFields(b.seo),
  });
  return NextResponse.json({ ok: true, item: toHealthRow(created) });
}
