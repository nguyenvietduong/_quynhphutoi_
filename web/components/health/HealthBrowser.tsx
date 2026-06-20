"use client";

// Bộ duyệt cơ sở y tế — lọc theo loại (tabs), xã, loại hình + tìm kiếm; lưới thẻ.
import { useMemo, useState } from "react";
import Link from "next/link";
import { FilterBar } from "@/components/common/FilterBar";
import { ListPager } from "@/components/common/ListPager";
import { usePagedList } from "@/lib/use-paged-list";
import { Combobox } from "@/components/lostfound/Combobox";

export type HealthItem = {
  slug: string;
  name: string;
  type: string;               // slug danh mục module "y-te"
  typeLabel: string;
  ownership: string;          // slug danh mục module "so-huu-y-te"
  ward: string;
  wardSlug: string;
  newCommune: string | null;
  phone: string | null;
  hours: string | null;
  emergency: boolean;
  verified: boolean;
  image: string | null;
};

type Option = { slug: string; name: string };

const PAGE_SIZE = 12;

function IcHospital() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" /><path d="M2 21h20" /><path d="M12 8v6M9 11h6" /><path d="M9 21v-3a3 3 0 0 1 6 0v3" /></svg>; }
function IcCross() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12h6V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6h6v4h-6v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6H3z" /></svg>; }
function IcPill() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" /><path d="M8.5 8.5 15 15" /></svg>; }
function HealthIcon({ type }: { type: string }) {
  if (type === "benh-vien" || type === "trung-tam-y-te") return <IcHospital />;
  if (type === "nha-thuoc") return <IcPill />;
  return <IcCross />;
}

function HealthCard({ h, ownerLabel }: { h: HealthItem; ownerLabel: (s: string) => string }) {
  const href = `/y-te/${h.slug}`;
  return (
    <article className="qp-job-card">
      {h.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="qp-health-card__img" src={h.image} alt={h.name} loading="lazy" />
      )}
      <div className="qp-job-card__head">
        <span className={`qp-health-logo is-${h.type}`} aria-hidden><HealthIcon type={h.type} /></span>
        <div className="qp-job-card__head-main">
          <Link className="qp-job-card__title" href={href}>{h.name}</Link>
          <div className="qp-job-card__company">📍 {h.ward}{h.newCommune ? ` · ${h.newCommune}` : ""}</div>
        </div>
      </div>
      <div className="qp-job-card__tags">
        <span className="qp-tag-cat">{h.typeLabel}</span>
        <span className={`qp-health-own is-${h.ownership}`}>{ownerLabel(h.ownership)}</span>
        {h.emergency && <span className="qp-health-emergency">Cấp cứu 24/7</span>}
      </div>
      {h.hours && <div className="qp-job-card__meta"><span>🕒 {h.hours}</span></div>}
      <div className="qp-job-card__foot">
        <Link href={href} className="qp-job-card__view">Xem chi tiết →</Link>
        {h.phone && <a className="qp-lf-card__phone" href={`tel:${h.phone.replace(/\s/g, "")}`}>☎ {h.phone}</a>}
      </div>
    </article>
  );
}

export function HealthBrowser({
  items, wards, counts, typeOptions, ownershipOptions,
}: {
  items: HealthItem[];
  wards: { slug: string; name: string; newCommune?: string }[];
  counts: Record<string, number>;
  typeOptions: Option[];
  ownershipOptions: Option[];
}) {
  const [type, setType] = useState("all");
  const [ward, setWard] = useState("all");
  const [owner, setOwner] = useState("all");
  const [query, setQuery] = useState("");

  const typeTabs = useMemo(() => [{ key: "all", label: "Tất cả" }, ...typeOptions.map((t) => ({ key: t.slug, label: t.name }))], [typeOptions]);
  const ownerLabel = (s: string) => ownershipOptions.find((o) => o.slug === s)?.name ?? s;

  const wardOptions = useMemo(() => [{ value: "all", label: `Tất cả xã/thị trấn (${wards.length})` }, ...wards.map((w) => ({ value: w.slug, label: w.name, hint: w.newCommune ? `Xã mới: ${w.newCommune}` : undefined }))], [wards]);
  const ownerOptions = useMemo(() => [{ value: "all", label: "Tất cả loại hình" }, ...ownershipOptions.map((o) => ({ value: o.slug, label: o.name }))], [ownershipOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((h) => {
      const okType = type === "all" || h.type === type;
      const okWard = ward === "all" || h.wardSlug === ward;
      const okOwner = owner === "all" || h.ownership === owner;
      const okQ = !q || h.name.toLowerCase().includes(q) || h.ward.toLowerCase().includes(q);
      return okType && okWard && okOwner && okQ;
    });
  }, [items, type, ward, owner, query]);

  const pager = usePagedList(filtered, PAGE_SIZE);
  const pageItems = pager.items;
  const reset = pager.reset;

  return (
    <>
      <div className="qp-tabs" role="tablist" aria-label="Lọc theo loại cơ sở">
        {typeTabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={type === t.key}
            className={`qp-tab${type === t.key ? " is-active" : ""}`} onClick={() => { setType(t.key); reset(); }}>
            {t.label} <span className="qp-tab__count">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <FilterBar
        className="qp-school-toolbar qp-lf-toolbar"
        activeCount={(ward !== "all" ? 1 : 0) + (owner !== "all" ? 1 : 0)}
        searchInput={
          <input type="search" placeholder="Tìm tên cơ sở, xã…" aria-label="Tìm cơ sở y tế" value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} />
        }
      >
        <div className="qp-toolbar__field"><span className="qp-toolbar__label">Xã / Thị trấn</span><Combobox options={wardOptions} value={ward} onChange={(v) => { setWard(v); reset(); }} placeholder="Tất cả xã/thị trấn" searchPlaceholder="Tìm xã…" /></div>
        <div className="qp-toolbar__field"><span className="qp-toolbar__label">Loại hình</span><Combobox options={ownerOptions} value={owner} onChange={(v) => { setOwner(v); reset(); }} placeholder="Tất cả loại hình" searchPlaceholder="Tìm…" /></div>
      </FilterBar>

      <div className="qp-newsgrid-head qp-newsgrid-head--count">
        <span className="type-tag qp-sechead__eyebrow">Danh bạ</span>
        <h2 className="type-h2">{filtered.length} cơ sở</h2>
      </div>

      {pageItems.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không tìm thấy cơ sở</div><p className="type-body-small">Thử đổi loại, xã hoặc từ khoá khác.</p></div>
      ) : (
        <div className="qp-job-grid">{pageItems.map((h) => <HealthCard key={h.slug} h={h} ownerLabel={ownerLabel} />)}</div>
      )}

      <ListPager pager={pager} />
    </>
  );
}
