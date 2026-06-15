import { buildMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import Link from "next/link";
import { listAdminUnits } from "@/lib/admin-units";
import { getDistrict } from "@/lib/district";
import { schools } from "@/lib/schools";
import { health } from "@/lib/health";
import { transit } from "@/lib/transit";
import { relics } from "@/lib/relics";

export const metadata = buildMetadata({
  title: "Tổng quan xã Quỳnh Phụ",
  description: "Tổng quan xã Quỳnh Phụ (Thái Bình): vị trí địa lý, dân số, hành chính, kinh tế và sáp nhập đơn vị hành chính 2025.",
  path: "/tong-quan",
});

export const dynamic = "force-dynamic";

export default async function TongQuanPage() {
  const [d, units, schoolCount, healthCount, transitCount, relicCount] = await Promise.all([
    getDistrict(),
    listAdminUnits(),
    schools().then((c) => c.countDocuments()),
    health().then((c) => c.countDocuments()),
    transit().then((c) => c.countDocuments()),
    relics().then((c) => c.countDocuments()),
  ]);
  if (!d) notFound(); // chưa seed hồ sơ huyện → chạy `npm run seed:district`
  const newCommunes = new Set(units.map((u) => u.newCommuneSlug)).size;
  const rows = [...units].sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <>
      <section className="qp-pagehero" aria-labelledby="tq-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Tổng quan</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Khám phá</span>
          <h1 id="tq-title" className="type-h1">Tổng quan {d.fullName.toLowerCase()}</h1>
          <p className="qp-pagehero__lead">
            {d.region}, tỉnh {d.province} — vùng quê lúa giàu truyền thống văn hoá, lịch sử
            và đang chuyển mình mạnh mẽ về kinh tế.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-kpi-strip">
        <div className="container-wide">
          <div className="qp-kpi-grid">
            <Kpi value={d.areaText ?? String(d.area)} unit="km²" label="Diện tích tự nhiên" />
            <Kpi value={d.populationText ?? String(d.population)} unit="người" label={`Dân số${d.populationYear ? ` (${d.populationYear})` : ""}`} />
            <Kpi value={String(units.length)} unit="đơn vị cũ" label={`→ ${newCommunes} xã mới (2025)`} />
            <Kpi value={String(schoolCount)} unit="trường" label="Cơ sở giáo dục" />
          </div>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          {/* Giới thiệu — nội dung từ DB */}
          <div className="qp-prose" style={{ maxWidth: 820 }}>
            {d.sections.map((s) => (
              <div key={s.title}>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
                {s.title === "Vị trí địa lý" && d.borders.length > 0 && (
                  <ul className="qp-tq-borders">
                    {d.borders.map((b) => (
                      <li key={b.dir}><b>Phía {b.dir}:</b> {b.desc}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <h2>Hành chính</h2>
            <p>
              Trước năm 2025, huyện gồm <b>{units.length} đơn vị hành chính</b> cấp xã ({d.townships.length} thị trấn{" "}
              {d.townships.join(", ")} và các xã). Từ <b>1/7/2025</b>, theo chủ trương sắp xếp đơn vị hành chính và tổ chức
              chính quyền địa phương 2 cấp, cấp huyện được giải thể; {units.length} đơn vị cũ hợp nhất thành{" "}
              <b>{newCommunes} xã mới</b> trực thuộc <b>tỉnh Hưng Yên</b>. Xem chi tiết tại trang{" "}
              <Link href="/sap-nhap">Sáp nhập xã 2025</Link>.
            </p>

            {d.specialties && d.specialties.length > 0 && (
              <>
                <h2>Đặc sản &amp; điểm nhấn</h2>
                <div className="qp-chip-row">
                  {d.specialties.map((s) => <span key={s} className="qp-chip">{s}</span>)}
                </div>
              </>
            )}

            {d.source && <p className="type-body-small text-muted" style={{ marginTop: "var(--space-6)" }}>* {d.source}</p>}
          </div>

          {/* Liên kết nhanh */}
          <div className="qp-tq-links">
            <QuickLink href="/truong-hoc" label="Trường học" value={`${schoolCount} cơ sở`} />
            <QuickLink href="/y-te" label="Y tế" value={`${healthCount} cơ sở`} />
            <QuickLink href="/giao-thong" label="Giao thông" value={`${transitCount} tuyến`} />
            <QuickLink href="/di-tich" label="Di tích" value={`${relicCount} di tích`} />
            <QuickLink href="/sap-nhap" label="Sáp nhập xã 2025" value={`${newCommunes} xã mới`} />
          </div>

          {/* Bảng đơn vị hành chính */}
          <div className="qp-newsgrid-head" style={{ marginTop: "var(--space-10)" }}>
            <span className="type-tag qp-sechead__eyebrow">Hành chính</span>
            <h2 className="type-h2">Đơn vị hành chính ({units.length} đơn vị cũ)</h2>
          </div>
          <div className="qp-table--wrap">
            <table className="qp-table">
              <thead>
                <tr><th>STT</th><th>Đơn vị (trước 2025)</th><th>Loại</th><th>Xã mới (2025)</th><th>Tỉnh mới</th></tr>
              </thead>
              <tbody>
                {rows.map((u, i) => (
                  <tr key={u.slug}>
                    <td>{i + 1}</td>
                    <td><b>{u.name}</b></td>
                    <td>{u.prefix}</td>
                    <td style={{ color: "var(--color-teal-dark)", fontWeight: 600 }}>Xã {u.newCommune}</td>
                    <td>{u.newProvince}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

function Kpi({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="qp-kpi">
      <div className="qp-kpi__value"><span className="num">{value}</span><span className="unit">{unit}</span></div>
      <div className="qp-kpi__label">{label}</div>
    </div>
  );
}

function QuickLink({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link href={href} className="qp-tq-link">
      <span className="qp-tq-link__label">{label}</span>
      <span className="qp-tq-link__value">{value}</span>
      <span className="qp-tq-link__arrow" aria-hidden>→</span>
    </Link>
  );
}
