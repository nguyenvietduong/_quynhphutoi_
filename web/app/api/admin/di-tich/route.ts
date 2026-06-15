// Admin: liệt kê (GET) & tạo (POST) di tích.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listRelics, createRelic, toRelicRow, type RelicType, type RelicRanking } from "@/lib/relics";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { WARDS } from "@/lib/wards";

const TYPES: RelicType[] = ["den", "chua", "dinh", "mieu", "nha-tho", "khac"];
const RANKINGS: RelicRanking[] = ["quoc-gia", "cap-tinh", "kiem-ke"];
const WARD_SET = new Set(WARDS.map((w) => w.slug));

export async function GET() {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const docs = await listRelics({});
  return NextResponse.json({ items: docs.map(toRelicRow) });
}

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));

  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "Nhập tên di tích." }, { status: 400 });
  if (!TYPES.includes(b.type)) return NextResponse.json({ error: "Loại di tích không hợp lệ." }, { status: 400 });
  if (!WARD_SET.has(String(b.wardSlug))) return NextResponse.json({ error: "Chọn xã/thị trấn hợp lệ." }, { status: 400 });
  if (b.ranking !== undefined && b.ranking !== "" && !RANKINGS.includes(b.ranking))
    return NextResponse.json({ error: "Xếp hạng không hợp lệ." }, { status: 400 });

  const images = Array.isArray(b.images) ? (b.images as unknown[]).map(String) : [];
  const created = await createRelic({
    name, type: b.type, wardSlug: b.wardSlug, address: b.address,
    description: b.description, era: b.era, worship: b.worship, festival: b.festival,
    ranking: b.ranking || undefined, recognizedYear: b.recognizedYear ? Number(b.recognizedYear) : undefined,
    images, verified: !!b.verified, featured: !!b.featured, active: b.active !== false,
    seo: sanitizeSeoFields(b.seo),
  });
  return NextResponse.json({ ok: true, item: toRelicRow(created) });
}
