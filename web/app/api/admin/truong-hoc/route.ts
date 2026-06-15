// Admin: liệt kê (GET) & tạo (POST) trường học.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listSchools, createSchool, toSchoolRow, SCHOOL_LEVELS, type SchoolLevel, type SchoolType } from "@/lib/schools";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { WARDS } from "@/lib/wards";

const LEVELS = SCHOOL_LEVELS.map((l) => l.slug) as SchoolLevel[];
const TYPES: SchoolType[] = ["cong-lap", "tu-thuc", "dan-lap", "gdnn-gdtx"];
const WARD_SET = new Set(WARDS.map((w) => w.slug));

export async function GET() {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const docs = await listSchools({});
  return NextResponse.json({ items: docs.map(toSchoolRow) });
}

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));

  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "Nhập tên trường." }, { status: 400 });
  if (!LEVELS.includes(b.level)) return NextResponse.json({ error: "Cấp học không hợp lệ." }, { status: 400 });
  if (!TYPES.includes(b.type)) return NextResponse.json({ error: "Loại hình không hợp lệ." }, { status: 400 });
  if (!WARD_SET.has(String(b.wardSlug))) return NextResponse.json({ error: "Chọn xã/thị trấn hợp lệ." }, { status: 400 });

  const levels = Array.isArray(b.levels) ? (b.levels as SchoolLevel[]).filter((l) => LEVELS.includes(l)) : [];
  const created = await createSchool({
    name, shortName: b.shortName, level: b.level, levels: levels.length ? levels : [b.level], type: b.type,
    wardSlug: b.wardSlug, address: b.address, phone: b.phone, email: b.email, website: b.website,
    principal: b.principal, foundedYear: b.foundedYear ? Number(b.foundedYear) : undefined,
    description: b.description, sourceUrl: b.sourceUrl,
    verified: !!b.verified, active: b.active !== false,
    seo: sanitizeSeoFields(b.seo),
  });
  return NextResponse.json({ ok: true, item: toSchoolRow(created) });
}
