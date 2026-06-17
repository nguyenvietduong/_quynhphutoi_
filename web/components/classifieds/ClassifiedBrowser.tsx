"use client";

// Bộ duyệt Mua bán — lọc danh mục/xã + tìm kiếm + tab "Chờ duyệt"; lưới thẻ tin.
import { useMemo, useState } from "react";
import Link from "next/link";
import { FilterBar } from "@/components/common/FilterBar";
import { ListPager } from "@/components/common/ListPager";
import { usePagedList } from "@/lib/use-paged-list";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/lostfound/Combobox";
import { CardMedia } from "@/components/common/CardMedia";
import { ClassifiedPostModal } from "./ClassifiedPostModal";
import { formatDate } from "@/lib/datetime";

export type ClassifiedItem = {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  images: string[];
  excerpt: string;
  priceText: string;
  condition: string | null;
  ward: string;
  wardSlug: string;
  newCommune: string | null;
  status: "open" | "sold" | "closed";
  featured: boolean;
  views: number;
  createdAt: string;
  phone: string | null;
};

const PAGE_SIZE = 12;

function Tag() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20.6 13.4 12 22l-9-9V3h10l8.6 8.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>; }
function Pin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>; }
function Eye() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>; }
function Cal() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>; }


function AdCard({ a, pending = false, condMap }: { a: ClassifiedItem; pending?: boolean; condMap: Record<string, string> }) {
  const href = `/mua-ban/${a.slug}`;
  return (
    <article className={`qp-newscard${pending ? " is-pending" : ""}`}>
      <Link href={href} className={`qp-newscard__media${a.images.length ? "" : " qp-newscard__media--icon"}`} aria-label={a.title}>
        <CardMedia images={a.images} fallback={<Tag />} alt={a.title} />
        <span className="qp-newscard__badge">{a.categoryLabel}</span>
        {pending ? <span className="qp-newscard__badge qp-newscard__badge--tr is-lost">⏳ Chờ duyệt</span>
          : a.status === "sold" ? <span className="qp-newscard__badge qp-newscard__badge--tr">Đã bán</span>
          : a.featured ? <span className="qp-newscard__badge qp-newscard__badge--tr is-found">NỔI BẬT</span> : null}
      </Link>
      <div className="qp-newscard__body">
        <h3 className="qp-newscard__title"><Link href={href}>{a.title}</Link></h3>
        {a.excerpt && <p className="qp-newscard__excerpt">{a.excerpt}</p>}
        <div className="qp-newscard__price">
          <span className="qp-newscard__price-val">{a.priceText}</span>
          {a.condition && <span className="qp-newscard__price-cond">{condMap[a.condition] ?? a.condition}</span>}
        </div>
        <div className="qp-newscard__meta qp-lf-meta">
          <div className="qp-lf-meta__loc">
            <Pin /> <span>{a.ward}{a.newCommune ? <span className="qp-newscard__nc"> ({a.newCommune})</span> : null}</span>
          </div>
          <div className="qp-lf-meta__sub">
            <span className="qp-lf-meta__item"><Cal /> {formatDate(a.createdAt)}</span>
            <span className="qp-lf-meta__item"><Eye /> {a.views} lượt xem</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ClassifiedBrowser({
  items, pendingItems, categories, conditions, wards, isLoggedIn, defaultName, maxImages,
}: {
  items: ClassifiedItem[];
  pendingItems: ClassifiedItem[];
  categories: { slug: string; name: string }[];
  conditions: { slug: string; name: string }[];
  wards: { slug: string; name: string; newCommune?: string }[];
  isLoggedIn: boolean;
  defaultName: string;
  maxImages: number;
}) {
  const [view, setView] = useState<"all" | "cho-duyet">("all");
  const [category, setCategory] = useState("all");
  const [ward, setWard] = useState("all");
  const [query, setQuery] = useState("");
  const [postOpen, setPostOpen] = useState(false);
  const router = useRouter();
  const isPending = view === "cho-duyet";

  const condMap = useMemo(() => Object.fromEntries(conditions.map((c) => [c.slug, c.name])), [conditions]);
  const catOptions = useMemo(() => [{ value: "all", label: `Tất cả danh mục (${categories.length})` }, ...categories.map((c) => ({ value: c.slug, label: c.name }))], [categories]);
  const wardOptions = useMemo(() => [{ value: "all", label: `Tất cả xã/thị trấn (${wards.length})` }, ...wards.map((w) => ({ value: w.slug, label: w.name, hint: w.newCommune ? `Xã mới: ${w.newCommune}` : undefined }))], [wards]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const src = isPending ? pendingItems : items;
    return src.filter((a) => {
      const okCat = category === "all" || a.category === category;
      const okWard = ward === "all" || a.wardSlug === ward;
      const okQ = !q || a.title.toLowerCase().includes(q) || a.ward.toLowerCase().includes(q);
      return okCat && okWard && okQ;
    });
  }, [items, pendingItems, isPending, category, ward, query]);

  const pager = usePagedList(filtered, PAGE_SIZE);
  const pageItems = pager.items;
  const reset = pager.reset;

  return (
    <>
      <div className="qp-lf-head">
        <div className="qp-tabs" role="tablist" aria-label="Lọc tin">
          <button type="button" role="tab" aria-selected={view === "all"} className={`qp-tab${view === "all" ? " is-active" : ""}`} onClick={() => { setView("all"); reset(); }}>
            Tất cả tin <span className="qp-tab__count">{items.length}</span>
          </button>
          {isLoggedIn && (
            <button type="button" role="tab" aria-selected={isPending} className={`qp-tab qp-tab--pending${isPending ? " is-active" : ""}`} onClick={() => { setView("cho-duyet"); reset(); }}>
              ⏳ Chờ duyệt <span className="qp-tab__count">{pendingItems.length}</span>
            </button>
          )}
        </div>
        <button type="button" className="qp-btn-primary qp-lf-post-btn" aria-label="Đăng tin mua bán" onClick={() => setPostOpen(true)}>
          <span className="qp-postbtn-full" aria-hidden>+ Đăng tin mua bán</span>
          <span className="qp-postbtn-short" aria-hidden>+ Đăng</span>
        </button>
      </div>

      <FilterBar
        className="qp-school-toolbar qp-lf-toolbar"
        activeCount={(category !== "all" ? 1 : 0) + (ward !== "all" ? 1 : 0)}
        searchInput={
          <input type="search" placeholder="Tìm món đồ, tiêu đề…" aria-label="Tìm" value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} />
        }
      >
        <div className="qp-toolbar__field"><span className="qp-toolbar__label">Danh mục</span><Combobox options={catOptions} value={category} onChange={(v) => { setCategory(v); reset(); }} placeholder="Tất cả danh mục" searchPlaceholder="Tìm danh mục…" /></div>
        <div className="qp-toolbar__field"><span className="qp-toolbar__label">Xã / Thị trấn</span><Combobox options={wardOptions} value={ward} onChange={(v) => { setWard(v); reset(); }} placeholder="Tất cả xã/thị trấn" searchPlaceholder="Tìm xã…" /></div>
      </FilterBar>

      <div className="qp-newsgrid-head qp-newsgrid-head--count">
        <span className="type-tag qp-sechead__eyebrow">{isPending ? "Tin của bạn" : "Tin mua bán"}</span>
        <h2 className="type-h2">{filtered.length} tin{isPending ? " chờ duyệt" : ""}</h2>
      </div>

      {isPending && <p className="qp-lf-pending-note">Đây là các tin bạn vừa đăng, đang chờ duyệt. Sau khi được duyệt sẽ hiển thị công khai.</p>}

      {pageItems.length === 0 ? (
        <div className="qp-empty">
          <div className="qp-empty__title">{isPending ? "Bạn chưa có tin chờ duyệt" : "Chưa có tin phù hợp"}</div>
          <p className="type-body-small">{isPending ? "Bấm “+ Đăng tin mua bán” để gửi tin." : "Thử đổi danh mục, xã hoặc từ khoá."}</p>
        </div>
      ) : (
        <div className="qp-grid-news">{pageItems.map((a) => <AdCard key={a.slug} a={a} pending={isPending} condMap={condMap} />)}</div>
      )}

      <ListPager pager={pager} />

      {postOpen && <ClassifiedPostModal open onClose={() => setPostOpen(false)} isLoggedIn={isLoggedIn} defaultName={defaultName} maxImages={maxImages} categories={categories} conditions={conditions} onSuccess={() => router.refresh()} />}
    </>
  );
}
