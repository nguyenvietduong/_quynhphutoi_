// Admin: lấy tin từ API ngoài để xem trước (GET) và tạo nhanh hàng loạt BẢN NHÁP (POST).
// Mọi bài tạo ở đây luôn là status "draft" để admin chỉnh sửa rồi mới xuất bản.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createArticle, toArticleRow } from "@/lib/articles";
import { sanitizeHtml } from "@/lib/sanitize";
import { fetchExternalNews, type ExternalNewsItem } from "@/lib/external-news";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Dựng nội dung bài từ 1 tin ngoài: tóm tắt + dòng dẫn nguồn (link bài gốc).
function bodyFrom(it: ExternalNewsItem): string {
  const parts: string[] = [];
  if (it.description) parts.push(`<p>${esc(it.description)}</p>`);
  if (it.url) {
    const label = esc(it.source || it.url);
    parts.push(`<p>Nguồn: <a href="${esc(it.url)}" target="_blank" rel="noopener nofollow">${label}</a></p>`);
  }
  return parts.join("\n");
}

export async function GET(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const q = new URL(req.url).searchParams.get("q") || "";
  try {
    const items = await fetchExternalNews(q);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Không lấy được tin." }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));
  const items: ExternalNewsItem[] = Array.isArray(b.items) ? b.items : [];
  if (!items.length) return NextResponse.json({ error: "Chưa chọn tin nào." }, { status: 400 });

  const created = [];
  for (const it of items.slice(0, 50)) {
    const title = String(it?.title || "").trim();
    if (!title) continue;
    const image = typeof it.image === "string" && it.image.startsWith("http") ? it.image : "";
    const doc = await createArticle({
      title,
      excerpt: String(it.description || "").trim().slice(0, 300),
      category: "Thông báo",
      tags: [],
      coverImage: image,
      coverAlt: image ? title : undefined,
      author: { name: "Ban biên tập", title: it.source ? `Nguồn: ${it.source}` : undefined },
      bodyHtml: sanitizeHtml(bodyFrom(it)),
      featured: false,
      status: "draft", // LUÔN nháp — admin chỉnh sửa rồi mới xuất bản
      seo: {},
    });
    created.push(toArticleRow(doc));
  }

  if (!created.length) return NextResponse.json({ error: "Không tạo được bản nháp nào." }, { status: 400 });
  return NextResponse.json({ ok: true, items: created });
}
