"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pagination } from "@/components/common/Pagination";
import Image from "next/image";
import { fmtViews, dateKey, type Article } from "@/lib/news";
import { NewsCard } from "./NewsCard";

const PAGE_SIZE = 8;
const SORTS = [
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Đọc nhiều" },
  { value: "oldest", label: "Cũ nhất" },
] as const;
type SortValue = (typeof SORTS)[number]["value"];

const Sep = () => <span className="qp-dot-sep" aria-hidden />;

/* Card nổi bật cấp 1 — text trái + ảnh phải */
function FeaturedCard({ a }: { a: Article }) {
  const href = `/tin-tuc/${a.slug}`;
  return (
    <article className="qp-featured">
      <Link href={href} aria-label={a.title} className="qp-featured__link" />
      <div className="qp-featured__body">
        <span className="qp-tag-cat">{a.category}</span>
        <h2 className="qp-featured__title">{a.title}</h2>
        <p className="qp-featured__excerpt">{a.excerpt}</p>
        <div className="qp-featured__meta"><span>{a.date}</span><Sep /><span>{fmtViews(a.views)}</span></div>
      </div>
      <div className="qp-featured__media">
        <Image src={a.image} alt="" fill sizes="(max-width:767px) 100vw, 50vw" style={{ objectFit: "cover" }} />
      </div>
    </article>
  );
}

/* Card cấp 2 — gọn: ảnh + title 14px + meta */
function L2Card({ a }: { a: Article }) {
  const href = `/tin-tuc/${a.slug}`;
  return (
    <article className="qp-l2card">
      <Link href={href} aria-label={a.title} className="qp-l2card__link" />
      <div className="qp-l2card__media">
        <Image src={a.image} alt="" fill sizes="(max-width:767px) 124px, 33vw" style={{ objectFit: "cover" }} />
      </div>
      <div className="qp-l2card__body">
        <h3 className="qp-l2card__title">{a.title}</h3>
        <div className="qp-l2card__meta"><span>{a.date}</span><Sep /><span>{a.readTime}</span></div>
      </div>
    </article>
  );
}

function PopularItem({ a, rank }: { a: Article; rank: number }) {
  return (
    <Link href={`/tin-tuc/${a.slug}`} className="qp-popular__item">
      <span className="qp-popular__rank">{String(rank).padStart(2, "0")}</span>
      <span className="qp-popular__body">
        <span className="qp-popular__title">{a.title}</span>
        <span className="qp-popular__meta"><span>{a.date}</span><Sep /><span>{fmtViews(a.views)}</span></span>
      </span>
    </Link>
  );
}

export function NewsBrowser({ items = [] }: { items?: Article[] }) {
  const [category, setCategory] = useState("Tất cả");
  const [sort, setSort] = useState<SortValue>("newest");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const CATEGORIES = useMemo(() => ["Tất cả", ...Array.from(new Set(items.map((a) => a.category)))], [items]);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((a) => {
      const okCat = category === "Tất cả" || a.category === category;
      const okQ = !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
      return okCat && okQ;
    });
    return [...filtered].sort((x, y) => {
      if (sort === "oldest") return dateKey(x.date) - dateKey(y.date);
      if (sort === "popular") return y.views - x.views;
      return dateKey(y.date) - dateKey(x.date);
    });
  }, [items, category, sort, query]);

  const defaultMode = category === "Tất cả" && !query.trim() && page === 1;
  const featured = defaultMode ? sorted[0] : undefined;
  const levelTwo = defaultMode ? sorted.slice(1, 4) : [];
  const popular = useMemo(() => [...items].sort((a, b) => b.views - a.views).slice(0, 7), [items]);

  const listSource = defaultMode ? sorted.slice(4) : sorted;
  const totalPages = Math.max(1, Math.ceil(listSource.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = listSource.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const reset = () => setPage(1);

  return (
    <>
      {/* Toolbar */}
      <form className="qp-toolbar" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="qp-toolbar__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input type="search" placeholder="Tìm bài viết, thông báo…" aria-label="Tìm bài viết"
            value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} />
        </div>
        <label className="qp-toolbar__field">
          <span className="qp-toolbar__label">Danh mục</span>
          <select className="qp-select" aria-label="Lọc theo danh mục" value={category}
            onChange={(e) => { setCategory(e.target.value); reset(); }}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="qp-toolbar__field">
          <span className="qp-toolbar__label">Sắp xếp</span>
          <select className="qp-select" aria-label="Sắp xếp" value={sort}
            onChange={(e) => { setSort(e.target.value as SortValue); reset(); }}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </form>

      {/* Vùng nổi bật (chỉ ở chế độ mặc định) */}
      {defaultMode && featured && (
        <div className="qp-newszone">
          <div className="qp-newszone__main">
            <FeaturedCard a={featured} />
            {levelTwo.length > 0 && (
              <div className="qp-grid-l2">
                {levelTwo.map((a) => <L2Card key={a.id} a={a} />)}
              </div>
            )}
          </div>
          <aside className="qp-popular" aria-label="Đọc nhiều">
            <header className="qp-popular__head"><h2 className="type-h3">Đọc nhiều</h2></header>
            <div className="qp-popular__list">
              {popular.map((a, i) => <PopularItem key={a.id} a={a} rank={i + 1} />)}
            </div>
          </aside>
        </div>
      )}

      {/* Lưới tất cả tin tức */}
      <div className="qp-newsgrid-head">
        <span className="type-tag qp-sechead__eyebrow">{defaultMode ? "Mới cập nhật" : "Kết quả"}</span>
        <h2 className="type-h2">{defaultMode ? "Tất cả tin tức" : `${sorted.length} bài viết`}</h2>
      </div>

      {pageItems.length === 0 ? (
        <div className="qp-empty">
          <svg className="qp-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <div className="qp-empty__title">Không tìm thấy bài viết</div>
          <p className="type-body-small">Thử đổi danh mục hoặc từ khoá khác.</p>
        </div>
      ) : (
        <div className="qp-grid-news">
          {pageItems.map((a) => <NewsCard key={a.id} a={a} />)}
        </div>
      )}

      <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
    </>
  );
}
