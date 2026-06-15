import { pageMetadata } from "@/lib/page-seo";
import Link from "next/link";
import { listTransit, countByType, type TransitDoc } from "@/lib/transit";
import { TransitBrowser, type TransitItem } from "@/components/transit/TransitBrowser";

export async function generateMetadata() {
  return pageMetadata({
    key: "/giao-thong", path: "/giao-thong",
    title: "Giao thông xã Quỳnh Phụ",
    description: "Tuyến xe khách, xe buýt qua xã Quỳnh Phụ — liên tỉnh, nội tỉnh và nội huyện. Lộ trình, giá vé, giờ chạy và liên hệ đặt vé.",
  });
}

export const dynamic = "force-dynamic";

export default async function GiaoThongPage() {
  const [docs, byType] = await Promise.all([listTransit({}), countByType()]);

  const items: TransitItem[] = docs.map((d: TransitDoc) => ({
    slug: d.slug,
    name: d.name,
    type: d.type,
    typeLabel: d.typeLabel,
    origin: d.origin,
    destination: d.destination,
    operator: d.operator ?? null,
    fare: d.fare ?? null,
    frequency: d.frequency ?? null,
    duration: d.duration ?? null,
    phone: d.phone ?? null,
  }));

  const counts = {
    all: items.length,
    "lien-tinh": byType["lien-tinh"],
    "noi-tinh": byType["noi-tinh"],
    "xe-buyt": byType["xe-buyt"],
  };

  return (
    <>
      <section className="qp-pagehero" aria-labelledby="gt-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Giao thông</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Dịch vụ công · Giao thông</span>
          <h1 id="gt-title" className="type-h1">Giao thông Quỳnh Phụ</h1>
          <p className="qp-pagehero__lead">
            Tuyến xe khách và xe buýt qua huyện — đi Hà Nội, Hải Phòng, Quảng Ninh, TP Thái Bình và
            nội huyện. Tra lộ trình, giá vé, giờ chạy và liên hệ đặt vé.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-kpi-strip">
        <div className="container-wide">
          <div className="qp-alert is-warning" role="note" style={{ marginTop: "var(--space-8)" }}>
            <svg className="qp-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
            <div className="qp-alert__body"><strong>Lưu ý:</strong> giờ chạy có thể thay đổi dịp lễ Tết — nên gọi nhà xe xác nhận và đặt vé trước.</div>
          </div>
          <div className="qp-kpi-grid">
            <Kpi value={counts.all} unit="tuyến" label="Tổng số tuyến" />
            <Kpi value={counts["lien-tinh"]} unit="tuyến" label="Liên tỉnh" />
            <Kpi value={counts["noi-tinh"] + counts["xe-buyt"]} unit="tuyến" label="Nội tỉnh & buýt" />
          </div>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <TransitBrowser items={items} counts={counts} />
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
