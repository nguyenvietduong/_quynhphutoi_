// Admin: liệt kê (GET) & tạo (POST) bài viết tin tức.
import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin-guard";
import { listAllArticles, createArticle, toArticleRow, type ArticleStatus } from "@/lib/articles";
import { sanitizeHtml } from "@/lib/sanitize";

const STATUSES: ArticleStatus[] = ["draft", "published"];

export async function GET() {
  const g = await requirePerm("tin-tuc", "view");
  if (g instanceof NextResponse) return g;
  const docs = await listAllArticles();
  return NextResponse.json({ items: docs.map(toArticleRow) });
}

export async function POST(req: Request) {
  const g = await requirePerm("tin-tuc", "edit");
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));

  const title = String(b.title || "").trim();
  const category = String(b.category || "").trim();
  if (!title) return NextResponse.json({ error: "Nhập tiêu đề bài viết." }, { status: 400 });
  if (!category) return NextResponse.json({ error: "Chọn chuyên mục." }, { status: 400 });
  const status: ArticleStatus = STATUSES.includes(b.status) ? b.status : "draft";

  const created = await createArticle({
    title, excerpt: String(b.excerpt || "").trim(), category, categorySlug: b.categorySlug,
    scope: b.scope === "ngoai-xa" ? "ngoai-xa" : "trong-xa",
    tags: Array.isArray(b.tags) ? b.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [],
    coverImage: String(b.coverImage || ""), coverAlt: b.coverAlt,
    author: { name: String(b.authorName || "Ban biên tập").trim(), title: b.authorTitle || undefined, avatarUrl: b.authorAvatar || undefined },
    bodyHtml: sanitizeHtml(String(b.bodyHtml || "")),
    featured: !!b.featured, status,
    seo: {
      metaTitle: b.seoMetaTitle || undefined, metaDescription: b.seoMetaDescription || undefined,
      keywords: Array.isArray(b.seoKeywords) ? b.seoKeywords : undefined,
      ogImage: b.seoOgImage || undefined, noindex: !!b.seoNoindex,
    },
  });
  return NextResponse.json({ ok: true, item: toArticleRow(created) });
}
