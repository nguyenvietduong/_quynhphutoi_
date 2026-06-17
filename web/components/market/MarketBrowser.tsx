"use client";

// Bộ duyệt Chợ & Mua bán — tab theo mảng (chợ phiên/đặc sản/rao vặt) + lọc xã + tìm kiếm.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Combobox } from "@/components/lostfound/Combobox";
import { FilterBar } from "@/components/common/FilterBar";
import { ListPager } from "@/components/common/ListPager";
import { usePagedList } from "@/lib/use-paged-list";

const PAGE_SIZE = 9;

export type MarketItem = {
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  ward: string;
  wardSlug: string;
  newCommune: string | null;
  schedule: string | null;
  priceText: string | null;
  unit: string | null;
  contactPhone: string | null;
  featured: boolean;
};

export type CategoryOption = { slug: string; name: string };
type Counts = Record<string, number> & { all: number };

function IcStore() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M3 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 3 0" /></svg>; }
function IcBag() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></svg>; }
function IcTag() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20.6 13.4 12 22l-9-9V3h10l8.6 8.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>; }
function CatIcon({ c }: { c: string }) {
  if (c === "cho-phien") return <IcStore />;
  if (c === "dac-san") return <IcBag />;
  return <IcTag />;
}

function MarketCard({ m }: { m: MarketItem }) {
  const href = `/cho/${m.slug}`;
  return (
    <article className="qp-job-card">
      <div className="qp-job-card__head">
        <span className={`qp-market-logo is-${m.category}`} aria-hidden><CatIcon c={m.category} /></span>
        <div className="qp-job-card__head-main">
          <Link className="qp-job-card__title" href={href}>{m.name}</Link>
          <div className="qp-job-card__company">📍 {m.ward}{m.newCommune ? ` · ${m.newCommune}` : ""}</div>
        </div>
      </div>
      <div className="qp-job-card__tags">
        <span className="qp-tag-cat">{m.categoryLabel}</span>
        {m.featured && <span className="qp-badge-g4">NỔI BẬT</span>}
      </div>
      <div className="qp-job-card__meta">
        {m.category === "cho-phien" && m.schedule && <span>📅 {m.schedule}</span>}
        {m.priceText && <span>💰 {m.priceText}{m.unit ? `/${m.unit}` : ""}</span>}
      </div>
      <div className="qp-job-card__foot">
        <Link href={href} className="qp-job-card__view">Xem chi tiết →</Link>
        {m.contactPhone && <a className="qp-lf-card__phone" href={`tel:${m.contactPhone.replace(/\s/g, "")}`}>☎ {m.contactPhone}</a>}
      </div>
    </article>
  );
}

export function MarketBrowser({
  items, wards, counts, categoryOptions,
}: {
  items: MarketItem[];
  wards: { slug: string; name: string; newCommune?: string }[];
  counts: Counts;
  categoryOptions: CategoryOption[];
}) {
  const tabs = useMemo(
    () => [{ key: "all", label: "Tất cả" }, ...categoryOptions.map((c) => ({ key: c.slug, label: c.name }))],
    [categoryOptions],
  );
  const [tab, setTab] = useState<string>("all");
  const [ward, setWard] = useState("all");
  const [query, setQuery] = useState("");

  const wardOptions = useMemo(() => [{ value: "all", label: `Tất cả xã/thị trấn (${wards.length})` }, ...wards.map((w) => ({ value: w.slug, label: w.name, hint: w.newCommune ? `Xã mới: ${w.newCommune}` : undefined }))], [wards]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      const okTab = tab === "all" || m.category === tab;
      const okWard = ward === "all" || m.wardSlug === ward;
      const okQ = !q || m.name.toLowerCase().includes(q) || m.ward.toLowerCase().includes(q);
      return okTab && okWard && okQ;
    });
  }, [items, tab, ward, query]);

  const pager = usePagedList(filtered, PAGE_SIZE);
  const pageItems = pager.items;
  const reset = pager.reset;

  return (
    <>
      <div className="qp-tabs" role="tablist" aria-label="Lọc theo mảng">
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
          <input type="search" placeholder="Tìm chợ, đặc sản…" aria-label="Tìm" value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} />
        }
      >
        <div className="qp-toolbar__field"><span className="qp-toolbar__label">Xã / Thị trấn</span><Combobox options={wardOptions} value={ward} onChange={(v) => { setWard(v); reset(); }} placeholder="Tất cả xã/thị trấn" searchPlaceholder="Tìm xã…" /></div>
      </FilterBar>

      <div className="qp-newsgrid-head qp-newsgrid-head--count">
        <span className="type-tag qp-sechead__eyebrow">Chợ & đặc sản</span>
        <h2 className="type-h2">{filtered.length} mục</h2>
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không tìm thấy mục nào</div><p className="type-body-small">Thử đổi mảng, xã hoặc từ khoá khác.</p></div>
      ) : (
        <>
          <div className="qp-job-grid">{pageItems.map((m) => <MarketCard key={m.slug} m={m} />)}</div>
          <ListPager pager={pager} />
        </>
      )}
    </>
  );
}
