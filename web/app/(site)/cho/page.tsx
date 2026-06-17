import { pageMetadata } from "@/lib/page-seo";
import { JsonLd } from "@/components/common/JsonLd";
import { jsonLdBreadcrumb } from "@/lib/seo";
import Link from "next/link";
import { listMarket, countByCategory, type MarketDoc } from "@/lib/market";
import { listActiveCategoryOptions } from "@/lib/categories";
import { getAdminUnitsMap } from "@/lib/admin-units";
import { MarketBrowser, type MarketItem } from "@/components/market/MarketBrowser";

export async function generateMetadata() {
  return pageMetadata({
    key: "/cho", path: "/cho",
    title: "Chợ xã Quỳnh Phụ",
    description: "Chợ phiên và đặc sản địa phương xã Quỳnh Phụ — lịch họp chợ, giá tham khảo theo từng xã, thị trấn.",
  });
}

export const dynamic = "force-dynamic";

export default async function ChoMuaBanPage() {
  const [docs, byCat, units, categoryOptions] = await Promise.all([listMarket({}), countByCategory(), getAdminUnitsMap(), listActiveCategoryOptions("cho")]);

  const items: MarketItem[] = docs.map((d: MarketDoc) => {
    const u = units.get(d.wardSlug);
    return {
      slug: d.slug,
      name: d.name,
      category: d.category,
      categoryLabel: d.categoryLabel,
      ward: u?.name ?? d.wardSlug,
      wardSlug: d.wardSlug,
      newCommune: u?.newCommune ?? null,
      schedule: d.schedule ?? null,
      priceText: d.priceText ?? null,
      unit: d.unit ?? null,
      contactPhone: d.contactPhone ?? null,
      featured: d.featured,
    };
  });

  const wards = [...new Map(items.map((i) => [i.wardSlug, { slug: i.wardSlug, name: i.ward, newCommune: i.newCommune ?? undefined }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const counts: Record<string, number> & { all: number } = { all: items.length, ...byCat };

  return (
    <>
      <JsonLd data={[jsonLdBreadcrumb([{ name: "Trang chủ", path: "/" }, { name: "Chợ", path: "/cho" }])]} />
      <section className="qp-pagehero" aria-labelledby="cmb-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Chợ</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Dịch vụ công · Chợ</span>
          <h1 id="cmb-title" className="type-h1">Chợ xã Quỳnh Phụ</h1>
          <p className="qp-pagehero__lead">
            Lịch chợ phiên và đặc sản địa phương tại xã Quỳnh Phụ — tra cứu lịch họp,
            giá tham khảo theo từng xã, thị trấn.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-kpi-strip">
        <div className="container-wide">
          <div className="qp-kpi-grid">
            {categoryOptions.map((c) => (
              <Kpi key={c.slug} value={counts[c.slug] ?? 0} unit="mục" label={c.name} />
            ))}
            <Kpi value={wards.length} unit="xã/TT" label="Có chợ/đặc sản" />
          </div>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <MarketBrowser items={items} wards={wards} counts={counts} categoryOptions={categoryOptions} />
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
