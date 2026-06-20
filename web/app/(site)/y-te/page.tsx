import { pageMetadata } from "@/lib/page-seo";
import { JsonLd } from "@/components/common/JsonLd";
import { jsonLdBreadcrumb } from "@/lib/seo";
import Link from "next/link";
import { listHealth, countByType, type HealthDoc } from "@/lib/health";
import { getAdminUnitsMap } from "@/lib/admin-units";
import { HealthBrowser, type HealthItem } from "@/components/health/HealthBrowser";
import { listActiveCategoryOptions } from "@/lib/categories";

export async function generateMetadata() {
  return pageMetadata({
    key: "/y-te", path: "/y-te",
    title: "Y tế xã Quỳnh Phụ",
    description: "Danh bạ cơ sở y tế xã Quỳnh Phụ — bệnh viện, trung tâm y tế, trạm y tế xã, phòng khám, nhà thuốc. Tra cứu theo loại và xã/thị trấn.",
  });
}

export const dynamic = "force-dynamic";

export default async function YTePage() {
  const [docs, byType, units, typeOptions, ownershipOptions] = await Promise.all([
    listHealth({}), countByType(), getAdminUnitsMap(),
    listActiveCategoryOptions("y-te"), listActiveCategoryOptions("so-huu-y-te"),
  ]);

  const items: HealthItem[] = docs.map((d: HealthDoc) => {
    const u = units.get(d.wardSlug);
    return {
      slug: d.slug,
      name: d.name,
      type: d.type,
      typeLabel: d.typeLabel,
      ownership: d.ownership,
      ward: u?.name ?? d.wardSlug,
      wardSlug: d.wardSlug,
      newCommune: u?.newCommune ?? null,
      phone: d.phone ?? null,
      hours: d.hours ?? null,
      emergency: !!d.emergency,
      verified: d.verified,
      image: d.image ?? null,
    };
  });

  const wards = [...new Map(items.map((i) => [i.wardSlug, { slug: i.wardSlug, name: i.ward, newCommune: i.newCommune ?? undefined }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const counts: Record<string, number> = { ...byType, all: items.length };

  return (
    <>
      <JsonLd data={[jsonLdBreadcrumb([{ name: "Trang chủ", path: "/" }, { name: "Y tế", path: "/y-te" }])]} />
      <section className="qp-pagehero" aria-labelledby="yt-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Y tế</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Dịch vụ công · Y tế</span>
          <h1 id="yt-title" className="type-h1">Y tế xã Quỳnh Phụ</h1>
          <p className="qp-pagehero__lead">
            Danh bạ cơ sở y tế trên địa bàn xã — bệnh viện, trung tâm y tế, trạm y tế các xã,
            phòng khám và nhà thuốc. Tra cứu theo loại cơ sở và theo xã, thị trấn.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-kpi-strip">
        <div className="container-wide">
          <div className="qp-alert is-info" role="note" style={{ marginTop: "var(--space-8)" }}>
            <svg className="qp-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
            <div className="qp-alert__body"><strong>Cấp cứu: gọi 115.</strong> Bệnh viện Đa khoa xã Quỳnh Phụ trực cấp cứu 24/7.</div>
          </div>
          <div className="qp-kpi-grid">
            <Kpi value={counts.all} unit="cơ sở" label="Tổng cơ sở y tế" />
            <Kpi value={counts["tram-y-te"] ?? 0} unit="trạm" label="Trạm y tế xã" />
            <Kpi value={(counts["benh-vien"] ?? 0) + (counts["trung-tam-y-te"] ?? 0)} unit="đơn vị" label="Tuyến huyện" />
          </div>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <HealthBrowser items={items} wards={wards} counts={counts} typeOptions={typeOptions} ownershipOptions={ownershipOptions} />
        </div>
      </section>
    </>
  );
}

function Kpi({ value, unit, label }: { value: number; unit: string; label: string }) {
  return (
    <div className="qp-kpi">
      <div className="qp-kpi__value"><span className="num">{value}</span><span className="unit">{unit}</span></div>
      <div className="qp-kpi__label">{label}</div>
    </div>
  );
}
