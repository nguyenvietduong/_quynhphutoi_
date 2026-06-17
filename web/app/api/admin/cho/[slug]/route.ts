// Admin: cập nhật (PATCH) & xoá (DELETE) một mục Chợ & Mua bán.
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { updateMarket, deleteMarket, type MarketInput } from "@/lib/market";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { WARDS } from "@/lib/wards";

const WARD_SET = new Set(WARDS.map((w) => w.slug));

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requireStaff();
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const b = await req.json().catch(() => ({}));

  const patch: Partial<MarketInput> = {};
  if (b.category !== undefined) { const c = String(b.category).trim(); if (!c) return NextResponse.json({ error: "Danh mục không hợp lệ." }, { status: 400 }); patch.category = c; }
  if (b.wardSlug !== undefined) { if (!WARD_SET.has(String(b.wardSlug))) return NextResponse.json({ error: "Xã/thị trấn không hợp lệ." }, { status: 400 }); patch.wardSlug = b.wardSlug; }
  for (const k of ["name", "address", "description", "schedule", "priceText", "unit", "contactName", "contactPhone"] as const)
    if (typeof b[k] === "string") patch[k] = b[k];
  if (typeof b.verified === "boolean") patch.verified = b.verified;
  if (typeof b.featured === "boolean") patch.featured = b.featured;
  if (typeof b.active === "boolean") patch.active = b.active;
  if ("seo" in b) patch.seo = sanitizeSeoFields(b.seo);

  const n = await updateMarket(slug, patch);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requireStaff();
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const n = await deleteMarket(slug);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
