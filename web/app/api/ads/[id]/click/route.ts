// Đếm click rồi chuyển hướng vào TRANG CHI TIẾT quảng cáo nội bộ (/quang-cao/[id]).
// Trang chi tiết mới là nơi hiển thị thông tin + SĐT + nút "Truy cập website" (link đích).
// Chống bơm: mỗi IP tối đa 20 click/10 phút cho 1 quảng cáo — vượt thì vẫn chuyển hướng nhưng không tăng đếm.
import { NextResponse } from "next/server";
import { recordClick, getAd } from "@/lib/ads";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rl = await rateLimit(`ad:click:${clientIp(req)}:${id}`, 20, 600);

  const found = rl.ok ? await recordClick(id) : !!(await getAd(id)); // vượt ngưỡng → không tăng click
  if (!found) return NextResponse.json({ error: "Không tìm thấy quảng cáo." }, { status: 404 });
  return NextResponse.redirect(new URL(`/quang-cao/${id}`, req.url), 302);
}
