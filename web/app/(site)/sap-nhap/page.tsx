import { pageMetadata } from "@/lib/page-seo";
import Link from "next/link";
import { listAdminUnits } from "@/lib/admin-units";
import { ReorgExplorer, type ReorgGroup } from "@/components/admin-units/ReorgExplorer";

export async function generateMetadata() {
  return pageMetadata({
    key: "/sap-nhap", path: "/sap-nhap",
    title: "Sáp nhập hành chính 2025 — Quỳnh Phụ",
    description: "Tra cứu sáp nhập đơn vị hành chính huyện Quỳnh Phụ năm 2025: 35 xã/thị trấn cũ hợp nhất thành 9 xã mới thuộc tỉnh Hưng Yên. Chọn xã mới để xem gồm những xã cũ nào.",
  });
}

export const dynamic = "force-dynamic";

export default async function SapNhapPage() {
  const units = await listAdminUnits();

  // Gom theo xã mới.
  const map = new Map<string, ReorgGroup>();
  for (const u of units) {
    let g = map.get(u.newCommuneSlug);
    if (!g) { g = { newCommune: u.newCommune, newCommuneSlug: u.newCommuneSlug, newProvince: u.newProvince, units: [] }; map.set(u.newCommuneSlug, g); }
    g.units.push({ slug: u.slug, name: u.name, prefix: u.prefix, district: u.district, province: u.province });
  }
  const groups = [...map.values()]
    .map((g) => ({ ...g, units: g.units.sort((a, b) => a.name.localeCompare(b.name, "vi")) }))
    .sort((a, b) => a.newCommune.localeCompare(b.newCommune, "vi"));

  return (
    <>
      <section className="qp-pagehero" aria-labelledby="sn-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Sáp nhập hành chính 2025</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Đơn vị hành chính</span>
          <h1 id="sn-title" className="type-h1">Sáp nhập xã 2025</h1>
          <p className="qp-pagehero__lead">
            Từ 1/7/2025, huyện Quỳnh Phụ (Thái Bình) giải thể cấp huyện; <b>{units.length} xã/thị trấn cũ</b> hợp nhất
            thành <b>{groups.length} xã mới</b> trực thuộc tỉnh Hưng Yên. Chọn một xã mới để xem gồm những xã cũ nào.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-kpi-strip">
        <div className="container-wide">
          <div className="qp-kpi-grid">
            <Kpi value={units.length} unit="đơn vị" label="Xã/thị trấn cũ" />
            <Kpi value={groups.length} unit="xã" label="Xã mới 2025" />
            <Kpi value={1} unit="tỉnh" label="Trực thuộc Hưng Yên" />
          </div>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <div className="qp-newsgrid-head">
            <span className="type-tag qp-sechead__eyebrow">Tra cứu</span>
            <h2 className="type-h2">Xã mới gồm những xã cũ nào?</h2>
          </div>
          <ReorgExplorer groups={groups} />
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
