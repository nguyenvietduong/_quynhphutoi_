// Admin: liệt kê (GET) & tạo (POST) mục Chợ & Mua bán.
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { listMarket, createMarket, toMarketRow } from "@/lib/market";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { WARDS } from "@/lib/wards";

const WARD_SET = new Set(WARDS.map((w) => w.slug));

export async function GET() {
  const g = await requireStaff();
  if (g instanceof NextResponse) return g;
  const docs = await listMarket({});
  return NextResponse.json({ items: docs.map(toMarketRow) });
}

export async function POST(req: Request) {
  const g = await requireStaff();
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));

  const name = String(b.name || "").trim();
  const category = String(b.category || "").trim();
  if (!name) return NextResponse.json({ error: "Nhập tên." }, { status: 400 });
  if (!category) return NextResponse.json({ error: "Chọn danh mục." }, { status: 400 });
  if (!WARD_SET.has(String(b.wardSlug))) return NextResponse.json({ error: "Chọn xã/thị trấn hợp lệ." }, { status: 400 });

  const created = await createMarket({
    name, category, wardSlug: b.wardSlug, address: b.address, description: b.description,
    schedule: b.schedule, priceText: b.priceText, unit: b.unit,
    contactName: b.contactName, contactPhone: b.contactPhone,
    seo: sanitizeSeoFields(b.seo),
    verified: !!b.verified, featured: !!b.featured, active: b.active !== false,
  });
  return NextResponse.json({ ok: true, item: toMarketRow(created) });
}
