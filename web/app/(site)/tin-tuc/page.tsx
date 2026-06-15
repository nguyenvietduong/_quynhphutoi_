import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import { NewsBrowser } from "@/components/news/NewsBrowser";
import { listArticles, listMyArticles, toNewsCardArticle } from "@/lib/articles";
import { getNewsPageConfig, resolveNewsBlocks } from "@/lib/news-page";
import { getSession } from "@/lib/auth";
import type { Article } from "@/lib/news";

export const metadata = buildMetadata({
  title: "Tin tức & thông báo",
  description: "Tin tức, thông báo và hoạt động tại xã Quỳnh Phụ, Thái Bình.",
  path: "/tin-tuc",
});

export const dynamic = "force-dynamic";

export default async function TinTucPage() {
  // Chỉ hiển thị bài đã xuất bản + đã duyệt (DB) — bài người dùng chờ duyệt không lọt ra đây.
  const [dbDocs, newsConfig, session] = await Promise.all([
    listArticles({ status: "published", limit: 60 }).catch(() => []),
    getNewsPageConfig().catch(() => null),
    getSession().catch(() => null),
  ]);
  const items: Article[] = dbDocs.map(toNewsCardArticle);
  // Bài người dùng đang chờ duyệt (chỉ của chính họ) — hiển thị ở tab "Chờ duyệt".
  const pendingItems: Article[] = session
    ? (await listMyArticles(session.id).catch(() => []))
        .filter((d) => d.approved === false && d.active !== false)
        .map(toNewsCardArticle)
    : [];
  // Vùng nổi bật & khối "Đọc nhiều" theo cấu hình admin (mặc định nếu chưa cấu hình).
  const blocks = newsConfig
    ? resolveNewsBlocks(newsConfig, items)
    : { featured: items.slice(0, 4), popular: [...items].sort((a, b) => b.views - a.views).slice(0, 7) };
  return (
    <>
      {/* Page hero sáng (gradient + đốm sáng + cây lúa halftone) */}
      <section className="qp-pagehero" aria-labelledby="news-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Tin tức</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Tin tức · Quỳnh Phụ</span>
          <h1 id="news-title" className="type-h1">Tin tức &amp; thông báo</h1>
          <p className="qp-pagehero__lead">
            Tổng hợp tin tức, thông báo và hoạt động tại xã Quỳnh Phụ — cập nhật thường xuyên.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <NewsBrowser items={items} featured={blocks.featured} popular={blocks.popular} isLoggedIn={!!session} pendingItems={pendingItems} />
        </div>
      </section>
    </>
  );
}
