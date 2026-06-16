import Link from "next/link";
import { searchAll, SEARCH_MODULES, MODULE_ICON } from "@/lib/search";
import { pageMetadata } from "@/lib/page-seo";

export async function generateMetadata() {
  return pageMetadata({
    key: "/tim-kiem",
    path: "/tim-kiem",
    title: "Tìm kiếm",
    description: "Tìm kiếm tin tức, việc làm, mua bán, tìm đồ rơi, trường học, y tế, giao thông và di tích trên Cổng thông tin Quỳnh Phụ.",
    noindex: true,
  });
}
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q = "", type = "" } = await searchParams;
  const query = q.trim();
  const moduleFilter = SEARCH_MODULES.some((m) => m.slug === type) ? type : "";
  const { total, groups } = query.length >= 2 ? await searchAll(query, 24, moduleFilter || undefined) : { total: 0, groups: [] };

  return (
    <>
      <section className="qp-pagehero" aria-labelledby="sr-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Tìm kiếm</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Tìm kiếm toàn cổng</span>
          <h1 id="sr-title" className="type-h1">{query ? <>Kết quả cho “{query}”</> : "Tìm kiếm"}</h1>
          <p className="qp-pagehero__lead">
            {query.length < 2 ? "Nhập từ khoá để tìm trên mọi mục: tin tức, việc làm, di tích, trường học, y tế…"
              : total > 0 ? <>Tìm thấy <b>{total}</b> kết quả trong {groups.length} mục.</>
              : `Không có kết quả phù hợp.`}
          </p>

          <form className="qp-searchpage-form" action="/tim-kiem" method="get" role="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input name="q" defaultValue={query} placeholder="Tìm bài viết, việc làm, di tích, trường học…" aria-label="Từ khoá tìm kiếm" autoComplete="off" />
            <select name="type" defaultValue={moduleFilter} aria-label="Giới hạn theo mục" className="qp-searchpage-form__select">
              <option value="">🗂️ Tất cả mục</option>
              {SEARCH_MODULES.map((m) => <option key={m.slug} value={m.slug}>{m.icon} {m.label}</option>)}
            </select>
            <button type="submit">Tìm kiếm</button>
          </form>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          {query.length >= 2 && total === 0 ? (
            <div className="qp-empty">
              <div className="qp-empty__title">Không tìm thấy “{query}”</div>
              <p className="type-body-small">Thử từ khoá khác, ngắn gọn hơn hoặc bỏ dấu.</p>
            </div>
          ) : (
            groups.map((g) => (
              <div className="qp-search-section" key={g.module}>
                <div className="qp-newsgrid-head">
                  <span className="type-tag qp-sechead__eyebrow">{MODULE_ICON[g.module]} {g.moduleLabel}</span>
                  <h2 className="type-h2">{g.hits.length} kết quả</h2>
                </div>
                <div className="qp-search-grid">
                  {g.hits.map((h) => (
                    <Link href={h.href} key={h.href} className="qp-search-card">
                      <span className={`qp-search-card__media${h.image ? "" : " is-ph"}`}>
                        {h.image
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={h.image} alt="" loading="lazy" />
                          : <span>{g.moduleLabel[0]}</span>}
                      </span>
                      <span className="qp-search-card__text">
                        <span className="qp-search-card__title">{h.title}</span>
                        <span className="qp-search-card__sub">{h.subtitle}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
