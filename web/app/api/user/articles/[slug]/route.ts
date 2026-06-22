// Người dùng tự xóa bài viết của chính mình.
// Nếu bài đó có cảnh báo chưa giải quyết → tự động giải quyết + giảm warnCount.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getArticleBySlug, deleteArticle } from "@/lib/articles";
import { resolveWarningByArticle } from "@/lib/user-warnings";
import { removeWarning } from "@/lib/users";

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });

  // Chỉ cho xóa bài của chính mình.
  if (article.postedBy?.toString() !== session.id) {
    return NextResponse.json({ error: "Bạn không có quyền xóa bài này." }, { status: 403 });
  }

  await deleteArticle(slug);

  // Nếu bài đó đang có warning chưa giải quyết → resolve + giảm warnCount.
  const articleId = article._id!.toString();
  const hadWarning = await resolveWarningByArticle(session.id, articleId);
  let warnCount: number | undefined;
  if (hadWarning) {
    const result = await removeWarning(session.id);
    warnCount = result?.warnCount;
  }

  return NextResponse.json({ ok: true, resolvedWarning: hadWarning, warnCount });
}
