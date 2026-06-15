// Admin: nạp từ điển tục từ thư viện ngoài (leo-profanity + bad-words) vào DB.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { importLibraryWords } from "@/lib/profanity";

export async function POST() {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  try {
    const { added, scanned } = await importLibraryWords();
    return NextResponse.json({ ok: true, added, scanned });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Không nạp được thư viện." }, { status: 500 });
  }
}
