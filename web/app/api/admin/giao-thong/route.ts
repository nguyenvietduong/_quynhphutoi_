// Admin: liệt kê (GET) & tạo (POST) tuyến giao thông.
import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin-guard";
import { listTransit, createTransit, toTransitRow } from "@/lib/transit";
import { listActiveCategoryOptions } from "@/lib/categories";
import { sanitizeSeoFields } from "@/lib/seo-fields";

// Chấp nhận stops dạng mảng chuỗi HOẶC chuỗi (tách theo xuống dòng/dấu phẩy) → string[].
function toStops(v: unknown): string[] {
  const arr = Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split(/[\n,]/) : [];
  return arr.map((s) => s.trim()).filter(Boolean);
}

export async function GET() {
  const g = await requirePerm("giao-thong", "view");
  if (g instanceof NextResponse) return g;
  const docs = await listTransit({});
  return NextResponse.json({ items: docs.map(toTransitRow) });
}

export async function POST(req: Request) {
  const g = await requirePerm("giao-thong", "edit");
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));

  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "Nhập tên tuyến." }, { status: 400 });
  const types = (await listActiveCategoryOptions("giao-thong")).map((t) => t.slug);
  if (!types.includes(b.type)) return NextResponse.json({ error: "Loại tuyến không hợp lệ." }, { status: 400 });
  const origin = String(b.origin || "").trim();
  if (!origin) return NextResponse.json({ error: "Nhập điểm đầu." }, { status: 400 });
  const destination = String(b.destination || "").trim();
  if (!destination) return NextResponse.json({ error: "Nhập điểm cuối." }, { status: 400 });

  const created = await createTransit({
    name, type: b.type, origin, destination, stops: toStops(b.stops),
    operator: b.operator, phone: b.phone, fare: b.fare,
    frequency: b.frequency, duration: b.duration, distance: b.distance, note: b.note,
    verified: !!b.verified, active: b.active !== false,
    seo: sanitizeSeoFields(b.seo),
  });
  return NextResponse.json({ ok: true, item: toTransitRow(created) });
}
