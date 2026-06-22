// Admin: nạp/khôi phục danh sách từ cấm mặc định (chỉ thêm từ chưa có).
import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin-guard";
import { seedProfanityWords } from "@/lib/profanity";

export async function POST() {
  const g = await requirePerm("loc-tu-ngu", "edit");
  if (g instanceof NextResponse) return g;
  const added = await seedProfanityWords();
  return NextResponse.json({ ok: true, added });
}
