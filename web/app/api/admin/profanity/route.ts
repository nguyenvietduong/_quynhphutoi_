// Admin: danh sách từ cấm (GET) & thêm từ (POST). Tự seed mặc định nếu còn trống.
import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin-guard";
import { listProfanityWords, addProfanityWord, addProfanityWords, splitWordList, seedProfanityWords, toProfanityRow } from "@/lib/profanity";

export async function GET() {
  const g = await requirePerm("loc-tu-ngu", "edit");
  if (g instanceof NextResponse) return g;
  let docs = await listProfanityWords();
  if (docs.length === 0) {
    await seedProfanityWords();
    docs = await listProfanityWords();
  }
  return NextResponse.json({ items: docs.map(toProfanityRow) });
}

export async function POST(req: Request) {
  const g = await requirePerm("loc-tu-ngu", "edit");
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));
  try {
    // Thêm hàng loạt: dán danh sách (ngăn bởi dấu phẩy / xuống dòng).
    const listSource = Array.isArray(b.texts) ? (b.texts as unknown[]).map(String) : typeof b.bulk === "string" ? splitWordList(b.bulk) : null;
    if (listSource) {
      const added = await addProfanityWords(listSource, !!b.accentInsensitive);
      return NextResponse.json({ ok: true, items: added.map(toProfanityRow), added: added.length });
    }
    const created = await addProfanityWord({
      text: String(b.text ?? ""),
      accentInsensitive: !!b.accentInsensitive,
      enabled: b.enabled !== false,
      note: typeof b.note === "string" ? b.note : undefined,
    });
    return NextResponse.json({ ok: true, item: toProfanityRow(created) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Không thêm được." }, { status: 400 });
  }
}
