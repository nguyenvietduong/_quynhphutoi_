// Admin duyệt / bỏ duyệt 1 bài viết do người dùng gửi.
import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin-guard";
import { approveArticle, getArticleBySlug } from "@/lib/articles";
import { notifyUser } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requirePerm("tin-tuc", "full");
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const approved = body.approved !== false;
  await approveArticle(slug, approved, approved ? { id: g.user._id!.toString(), name: g.user.name } : undefined);
  if (approved && article.postedBy) {
    await notifyUser(article.postedBy, { type: "post_approved", title: `Bài viết “${article.title}” của bạn đã được duyệt`, href: `/tin-tuc/${slug}`, module: "tin-tuc" });
  }
  return NextResponse.json({ ok: true, approved });
}
