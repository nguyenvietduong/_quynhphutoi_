"use client";

// Bộ duyệt tuyến giao thông — lọc theo loại (tabs) + tìm kiếm; lưới thẻ tuyến.
import { useMemo, useState } from "react";
import Link from "next/link";
import { ListPager } from "@/components/common/ListPager";
import { usePagedList } from "@/lib/use-paged-list";

const PAGE_SIZE = 9;

export type TransitItem = {
  slug: string;
  name: string;
  type: string;
  typeLabel: string;
  origin: string;
  destination: string;
  operator: string | null;
  fare: string | null;
  frequency: string | null;
  duration: string | null;
  phone: string | null;
};

export type TransitTypeOption = { slug: string; name: string };
type Counts = Record<string, number>;

function Bus() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="4" width="16" height="13" rx="2" /><path d="M4 11h16M8 17v2M16 17v2" /><circle cx="8.5" cy="14" r="1" /><circle cx="15.5" cy="14" r="1" /></svg>; }

function TransitCard({ t }: { t: TransitItem }) {
  const href = `/giao-thong/${t.slug}`;
  return (
    <article className="qp-job-card">
      <div className="qp-job-card__head">
        <span className="qp-job-card__logo" aria-hidden><Bus /></span>
        <div className="qp-job-card__head-main">
          <Link href={href} className="qp-job-card__title">{t.name}</Link>
          <div className="qp-transit-route">{t.origin} <span aria-hidden>→</span> {t.destination}</div>
        </div>
      </div>
      <div className="qp-job-card__tags">
        <span className="qp-tag-cat">{t.typeLabel}</span>
        {t.operator && <span className="qp-job-type">{t.operator}</span>}
      </div>
      <div className="qp-job-card__meta">
        {t.fare && <span>🎫 Giá vé: {t.fare}</span>}
        {t.frequency && <span>🕒 {t.frequency}</span>}
        {t.duration && <span>⏱ {t.duration}</span>}
      </div>
      <div className="qp-job-card__foot">
        <Link href={href} className="qp-job-card__view">Xem lộ trình →</Link>
        {t.phone && <a className="qp-lf-card__phone" href={`tel:${t.phone.replace(/\s/g, "")}`}>Đặt vé: {t.phone}</a>}
      </div>
    </article>
  );
}

export function TransitBrowser({ items, counts, typeOptions }: { items: TransitItem[]; counts: Counts; typeOptions: TransitTypeOption[] }) {
  const tabs = useMemo(
    () => [{ key: "all", label: "Tất cả" }, ...typeOptions.map((t) => ({ key: t.slug, label: t.name }))],
    [typeOptions],
  );
  const [tab, setTab] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((t) => {
      const okTab = tab === "all" || t.type === tab;
      const okQ = !q || t.name.toLowerCase().includes(q) || t.origin.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q);
      return okTab && okQ;
    });
  }, [items, tab, query]);

  const pager = usePagedList(filtered, PAGE_SIZE);
  const pageItems = pager.items;
  const reset = pager.reset;

  return (
    <>
      <div className="qp-lf-head">
        <div className="qp-tabs" role="tablist" aria-label="Lọc theo loại tuyến">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              className={`qp-tab${tab === t.key ? " is-active" : ""}`} onClick={() => { setTab(t.key); reset(); }}>
              {t.label} <span className="qp-tab__count">{t.key === "all" ? (counts.all ?? items.length) : (counts[t.key] ?? 0)}</span>
            </button>
          ))}
        </div>
        <div className="qp-toolbar__search" style={{ maxWidth: 320 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input type="search" placeholder="Tìm tuyến, điểm đi/đến…" aria-label="Tìm tuyến" value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} />
        </div>
      </div>

      <div className="qp-newsgrid-head qp-newsgrid-head--count">
        <span className="type-tag qp-sechead__eyebrow">Tuyến xe</span>
        <h2 className="type-h2">{filtered.length} tuyến</h2>
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không tìm thấy tuyến</div><p className="type-body-small">Thử đổi loại tuyến hoặc từ khoá khác.</p></div>
      ) : (
        <>
          <div className="qp-job-grid">{pageItems.map((t) => <TransitCard key={t.slug} t={t} />)}</div>
          <ListPager pager={pager} />
        </>
      )}
    </>
  );
}
