// Admin: liệt kê (GET) & tạo (POST) mục Chợ & Mua bán.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listMarket, createMarket, toMarketRow, MARKET_CATEGORIES, type MarketCategory } from "@/lib/market";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { WARDS } from "@/lib/wards";

const CATEGORIES = MARKET_CATEGORIES.map((c) => c.slug) as MarketCategory[];
const WARD_SET = new Set(WARDS.map((w) => w.slug));

export async function GET() {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const docs = await listMarket({});
  return NextResponse.json({ items: docs.map(toMarketRow) });
}

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));

  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "Nhập tên." }, { status: 400 });
  if (!CATEGORIES.includes(b.category)) return NextResponse.json({ error: "Danh mục không hợp lệ." }, { status: 400 });
  if (!WARD_SET.has(String(b.wardSlug))) return NextResponse.json({ error: "Chọn xã/thị trấn hợp lệ." }, { status: 400 });

  const created = await createMarket({
    name, category: b.category, wardSlug: b.wardSlug, address: b.address, description: b.description,
    schedule: b.schedule, priceText: b.priceText, unit: b.unit,
    contactName: b.contactName, contactPhone: b.contactPhone,
    seo: sanitizeSeoFields(b.seo),
    verified: !!b.verified, featured: !!b.featured, active: b.active !== false,
  });
  return NextResponse.json({ ok: true, item: toMarketRow(created) });
}
