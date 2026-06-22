// Admin: sửa (PATCH) & xoá (DELETE) một từ cấm.
import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin-guard";
import { updateProfanityWord, deleteProfanityWord, type ProfanityPatch } from "@/lib/profanity";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePerm("loc-tu-ngu", "edit");
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const patch: ProfanityPatch = {};
  if (typeof b.text === "string") patch.text = b.text;
  if (typeof b.accentInsensitive === "boolean") patch.accentInsensitive = b.accentInsensitive;
  if (typeof b.enabled === "boolean") patch.enabled = b.enabled;
  if (typeof b.note === "string") patch.note = b.note;
  try {
    const n = await updateProfanityWord(id, patch);
    if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Không lưu được." }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePerm("loc-tu-ngu", "edit");
  if (g instanceof NextResponse) return g;
  const { id } = await params;
  const n = await deleteProfanityWord(id);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
