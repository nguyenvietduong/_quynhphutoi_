import { pageMetadata } from "@/lib/page-seo";
import Link from "next/link";
import { listRelics, countByType, RANKING_LABEL, type RelicDoc } from "@/lib/relics";
import { getAdminUnitsMap } from "@/lib/admin-units";
import { RelicBrowser, type RelicItem } from "@/components/relics/RelicBrowser";

export async function generateMetadata() {
  return pageMetadata({
    key: "/di-tich", path: "/di-tich",
    title: "Di tích lịch sử - văn hoá Quỳnh Phụ",
    description: "Đình, chùa, đền, miếu và các di tích lịch sử - văn hoá xã Quỳnh Phụ — đền Đồng Bằng, đền A Sào… Tra cứu theo loại di tích và xã, thị trấn.",
  });
}

export const dynamic = "force-dynamic";

export default async function DiTichPage() {
  const [docs, byType, units] = await Promise.all([listRelics({}), countByType(), getAdminUnitsMap()]);

  const items: RelicItem[] = docs.map((d: RelicDoc) => {
    const u = units.get(d.wardSlug);
    return {
      slug: d.slug,
      name: d.name,
      type: d.type,
      typeLabel: d.typeLabel,
      images: d.images ?? [],
      ward: u?.name ?? d.wardSlug,
      wardSlug: d.wardSlug,
      newCommune: u?.newCommune ?? null,
      era: d.era ?? null,
      ranking: d.ranking ?? null,
      rankingLabel: d.ranking ? RANKING_LABEL[d.ranking] : null,
      featured: d.featured,
    };
  });

  const wards = [...new Map(items.map((i) => [i.wardSlug, { slug: i.wardSlug, name: i.ward, newCommune: i.newCommune ?? undefined }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const counts = { all: items.length, den: byType.den, chua: byType.chua, dinh: byType.dinh, mieu: byType.mieu, "nha-tho": byType["nha-tho"], khac: byType.khac };
  const national = items.filter((i) => i.ranking === "quoc-gia").length;

  return (
    <>
      <section className="qp-pagehero" aria-labelledby="dt-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Di tích</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Khám phá · Di sản</span>
          <h1 id="dt-title" className="type-h1">Di tích lịch sử - văn hoá Quỳnh Phụ</h1>
          <p className="qp-pagehero__lead">
            Vùng đất cổ Quỳnh Phụ lưu giữ nhiều đình, chùa, đền, miếu gắn với lịch sử và tín ngưỡng —
            tiêu biểu là đền Đồng Bằng và đền A Sào. Tra cứu theo loại di tích và xã, thị trấn.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-kpi-strip">
        <div className="container-wide">
          <div className="qp-kpi-grid">
            <Kpi value={items.length} unit="di tích" label="Tổng số di tích" />
            <Kpi value={national} unit="di tích" label="Xếp hạng quốc gia" />
            <Kpi value={wards.length} unit="xã/TT" label="Phủ khắp huyện" />
          </div>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <RelicBrowser items={items} wards={wards} counts={counts} />
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
