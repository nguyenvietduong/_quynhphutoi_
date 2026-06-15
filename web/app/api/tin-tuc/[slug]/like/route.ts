// Bật/tắt thích 1 bài viết (cần đăng nhập).
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getArticleBySlug } from "@/lib/articles";
import { toggleNewsLike } from "@/lib/news-social";
import { rateLimit, tooMany } from "@/lib/ratelimit";
import { getSettings } from "@/lib/settings";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Vui lòng đăng nhập để thích bài viết." }, { status: 401 });

  if (!(await getSettings()).likesEnabled) return NextResponse.json({ error: "Tính năng thích đang tạm khoá." }, { status: 403 });

  const rl = await rateLimit(`like:${session.id}`, 40, 60);
  if (!rl.ok) return tooMany(rl.retryAfter, "Bạn thao tác quá nhanh.");

  const { slug } = await params;
  const doc = await getArticleBySlug(slug);
  if (!doc || doc.status !== "published") return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });

  const result = await toggleNewsLike(slug, session.id);
  return NextResponse.json(result);
}
