import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import { NewsBrowser } from "@/components/news/NewsBrowser";
import { listArticles, toNewsCardArticle } from "@/lib/articles";
import type { Article } from "@/lib/news";

export const metadata = buildMetadata({
  title: "Tin tức & thông báo",
  description: "Tin tức, thông báo và hoạt động tại huyện Quỳnh Phụ, Thái Bình.",
  path: "/tin-tuc",
});

export const dynamic = "force-dynamic";

export default async function TinTucPage() {
  // Chỉ hiển thị bài viết admin đã xuất bản (DB) — không còn dữ liệu mẫu.
  const dbDocs = await listArticles({ status: "published", limit: 60 }).catch(() => []);
  const items: Article[] = dbDocs.map(toNewsCardArticle);
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
            Tổng hợp tin tức, thông báo và hoạt động tại huyện Quỳnh Phụ — cập nhật thường xuyên.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <NewsBrowser items={items} />
        </div>
      </section>
    </>
  );
}
