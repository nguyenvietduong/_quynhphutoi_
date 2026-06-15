// Admin: cập nhật (PATCH) & xoá (DELETE) một tuyến giao thông.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { updateTransit, deleteTransit, TRANSIT_TYPES, type TransitInput, type TransitType } from "@/lib/transit";
import { sanitizeSeoFields } from "@/lib/seo-fields";

const TYPES = TRANSIT_TYPES.map((t) => t.slug) as TransitType[];

function toStops(v: unknown): string[] {
  const arr = Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split(/[\n,]/) : [];
  return arr.map((s) => s.trim()).filter(Boolean);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const b = await req.json().catch(() => ({}));

  const patch: Partial<TransitInput> = {};
  for (const k of ["name", "origin", "destination", "operator", "phone", "fare", "frequency", "duration", "distance", "note"] as const)
    if (typeof b[k] === "string") patch[k] = b[k];
  if (b.type !== undefined) { if (!TYPES.includes(b.type)) return NextResponse.json({ error: "Loại tuyến không hợp lệ." }, { status: 400 }); patch.type = b.type; }
  if (b.stops !== undefined) patch.stops = toStops(b.stops);
  if (typeof b.verified === "boolean") patch.verified = b.verified;
  if (typeof b.active === "boolean") patch.active = b.active;
  if ("seo" in b) patch.seo = sanitizeSeoFields(b.seo);

  const n = await updateTransit(slug, patch);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const n = await deleteTransit(slug);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
