"use client";

// Bộ duyệt Di tích — tab theo loại (đền/chùa/đình…) + lọc xã + tìm kiếm; lưới thẻ tin có ảnh.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Combobox } from "@/components/lostfound/Combobox";
import { CardMedia } from "@/components/common/CardMedia";
import { FilterBar } from "@/components/common/FilterBar";
import { ListPager } from "@/components/common/ListPager";
import { usePagedList } from "@/lib/use-paged-list";

const PAGE_SIZE = 9;

export type RelicItem = {
  slug: string;
  name: string;
  type: string;
  typeLabel: string;
  images: string[];
  ward: string;
  wardSlug: string;
  newCommune: string | null;
  era: string | null;
  rankingLabel: string | null;
  ranking: string | null;
  featured: boolean;
};

type Counts = Record<string, number>;

function IcLandmark() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 21h18M4 21V10l8-5 8 5v11M9 21v-6h6v6M7 10v3M12 10v3M17 10v3" /></svg>; }
function IcPin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>; }
function IcClock() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }

function RelicCard({ r }: { r: RelicItem }) {
  const href = `/di-tich/${r.slug}`;
  return (
    <article className="qp-newscard">
      <Link href={href} className={`qp-newscard__media${r.images.length ? "" : " qp-newscard__media--icon"}`} aria-label={r.name}>
        <CardMedia images={r.images} fallback={<IcLandmark />} alt={r.name} />
        <span className="qp-newscard__badge">{r.typeLabel}</span>
        {r.ranking === "quoc-gia" && <span className="qp-newscard__badge qp-newscard__badge--tr is-found">DI TÍCH QUỐC GIA</span>}
      </Link>
      <div className="qp-newscard__body">
        <h3 className="qp-newscard__title"><Link href={href}>{r.name}</Link></h3>
        {r.rankingLabel && r.ranking !== "quoc-gia" && (
          <div className="qp-lf-card__top"><span className="qp-tag-cat">{r.rankingLabel}</span></div>
        )}
        <div className="qp-newscard__meta qp-lf-meta">
          <div className="qp-lf-meta__loc">
            <IcPin /> <span>{r.ward}{r.newCommune ? <span className="qp-newscard__nc"> ({r.newCommune})</span> : null}</span>
          </div>
          {r.era && (
            <div className="qp-lf-meta__sub">
              <span className="qp-lf-meta__item"><IcClock /> {r.era}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function RelicBrowser({
  items, wards, counts, typeOptions,
}: {
  items: RelicItem[];
  wards: { slug: string; name: string; newCommune?: string }[];
  counts: Counts;
  typeOptions: { slug: string; name: string }[];
}) {
  const tabs = useMemo(() => [{ key: "all", label: "Tất cả" }, ...typeOptions.map((t) => ({ key: t.slug, label: t.name }))], [typeOptions]);
  const [tab, setTab] = useState<string>("all");
  const [ward, setWard] = useState("all");
  const [query, setQuery] = useState("");

  const wardOptions = useMemo(() => [{ value: "all", label: `Tất cả xã/thị trấn (${wards.length})` }, ...wards.map((w) => ({ value: w.slug, label: w.name, hint: w.newCommune ? `Xã mới: ${w.newCommune}` : undefined }))], [wards]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      const okTab = tab === "all" || r.type === tab;
      const okWard = ward === "all" || r.wardSlug === ward;
      const okQ = !q || r.name.toLowerCase().includes(q) || r.ward.toLowerCase().includes(q);
      return okTab && okWard && okQ;
    });
  }, [items, tab, ward, query]);

  const pager = usePagedList(filtered, PAGE_SIZE);
  const pageItems = pager.items;
  const reset = pager.reset;

  return (
    <>
      <div className="qp-tabs" role="tablist" aria-label="Lọc theo loại di tích">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
            className={`qp-tab${tab === t.key ? " is-active" : ""}`} onClick={() => { setTab(t.key); reset(); }}>
            {t.label} <span className="qp-tab__count">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <FilterBar
        className="qp-school-toolbar qp-lf-toolbar"
        activeCount={ward !== "all" ? 1 : 0}
        searchInput={
          <input type="search" placeholder="Tìm di tích, đền, chùa…" aria-label="Tìm" value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} />
        }
      >
        <div className="qp-toolbar__field"><span className="qp-toolbar__label">Xã / Thị trấn</span><Combobox options={wardOptions} value={ward} onChange={(v) => { setWard(v); reset(); }} placeholder="Tất cả xã/thị trấn" searchPlaceholder="Tìm xã…" /></div>
      </FilterBar>

      <div className="qp-newsgrid-head qp-newsgrid-head--count">
        <span className="type-tag qp-sechead__eyebrow">Di tích lịch sử - văn hoá</span>
        <h2 className="type-h2">{filtered.length} di tích</h2>
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không tìm thấy di tích nào</div><p className="type-body-small">Thử đổi loại, xã hoặc từ khoá khác.</p></div>
      ) : (
        <>
          <div className="qp-grid-news">{pageItems.map((r) => <RelicCard key={r.slug} r={r} />)}</div>
          <ListPager pager={pager} />
        </>
      )}
    </>
  );
}
