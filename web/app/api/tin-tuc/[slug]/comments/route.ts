// Bình luận của 1 bài viết: GET danh sách, POST thêm (cần đăng nhập).
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getArticleBySlug } from "@/lib/articles";
import { addNewsComment, listNewsComments, newsCommenterIds } from "@/lib/news-social";
import { notifyMany } from "@/lib/notifications";
import { rateLimit, tooMany } from "@/lib/ratelimit";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { getSettings } from "@/lib/settings";

// Bài tồn tại nếu là bài DB đã xuất bản. Trả tiêu đề để dùng cho thông báo.
async function resolveArticleTitle(slug: string): Promise<string | null> {
  const d = await getArticleBySlug(slug);
  if (d && d.status === "published") return d.title;
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await resolveArticleTitle(slug))) return NextResponse.json({ items: [], count: 0 });

  const session = await getSession();
  const docs = await listNewsComments(slug);
  const items = docs.map((c) => ({
    id: c._id!.toString(),
    userName: c.userName,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    mine: !!session && session.id === c.userId.toString(),
  }));
  return NextResponse.json({ items, count: items.length });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Vui lòng đăng nhập để bình luận." }, { status: 401 });

  const settings = await getSettings();
  if (!settings.commentsEnabled) return NextResponse.json({ error: "Tính năng bình luận đang tạm khoá." }, { status: 403 });

  const rl = await rateLimit(`comment:${session.id}`, settings.commentMaxPerMin, 60);
  if (!rl.ok) return tooMany(rl.retryAfter, "Bạn bình luận quá nhanh. Vui lòng chậm lại.");

  const { slug } = await params;
  const articleTitle = await resolveArticleTitle(slug);
  if (!articleTitle) return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });

  const rlPost = await rateLimit(`comment:${session.id}:${slug}`, 5, 600);
  if (!rlPost.ok) return tooMany(rlPost.retryAfter, "Bạn bình luận quá nhiều vào bài này. Vui lòng chậm lại.");

  const body = await req.json().catch(() => ({}));
  if (!(await verifyRecaptcha(body.recaptchaToken))) {
    return NextResponse.json({ error: "Xác thực reCAPTCHA thất bại, vui lòng thử lại." }, { status: 403 });
  }
  const content = typeof body.content === "string" ? body.content : "";
  if (!content.trim()) return NextResponse.json({ error: "Nội dung bình luận trống." }, { status: 400 });
  if (content.length > settings.commentMaxLength) return NextResponse.json({ error: `Bình luận quá dài (tối đa ${settings.commentMaxLength} ký tự).` }, { status: 400 });

  try {
    const c = await addNewsComment(slug, { id: session.id, name: session.name }, content);

    // Bài viết không gắn chủ sở hữu → thông báo cho những người đã bình luận trong bài (trừ người vừa bình luận).
    const participants = await newsCommenterIds(slug);
    await notifyMany(participants, { type: "comment", title: `${session.name} đã bình luận bài “${articleTitle}”`, href: `/tin-tuc/${slug}#comments`, actorName: session.name, module: "tin-tuc" }, session.id);

    return NextResponse.json({
      ok: true,
      item: { id: c._id!.toString(), userName: c.userName, content: c.content, createdAt: c.createdAt.toISOString(), mine: true },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gửi bình luận thất bại." }, { status: 400 });
  }
}
