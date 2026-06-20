import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHealthBySlug, listByWard } from "@/lib/health";
import { categoryLabelMap } from "@/lib/categories";
import { getAdminUnitBySlug, fullOldAddress } from "@/lib/admin-units";
import { DetailSocial } from "@/components/common/DetailSocial";
import { buildMetadata, jsonLdHealth, jsonLdBreadcrumb } from "@/lib/seo";
import { applySeo } from "@/lib/seo-fields";
import { JsonLd } from "@/components/common/JsonLd";
import { AffiliateCTA } from "@/components/common/AffiliateCTA";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const h = await getHealthBySlug(slug);
  if (!h) return { title: "Không tìm thấy cơ sở y tế" };
  const u = await getAdminUnitBySlug(h.wardSlug);
  return buildMetadata({
    ...applySeo({
      title: `${h.name} — Y tế Quỳnh Phụ`,
      description: h.description || `${h.name} tại ${fullOldAddress(u ?? undefined, h.address)}.`,
    }, h.seo),
    path: `/y-te/${slug}`,
    modifiedTime: h.updatedAt?.toISOString(),
  });
}

export default async function HealthDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await getHealthBySlug(slug);
  if (!h || !h.active) notFound();

  const [unit, ownMap] = await Promise.all([getAdminUnitBySlug(h.wardSlug), categoryLabelMap("so-huu-y-te")]);
  const oldAddress = fullOldAddress(unit ?? undefined, h.address);
  const newAddress = unit ? `Xã ${unit.newCommune}, ${unit.newProvince}` : "";
  const related = (await listByWard(h.wardSlug)).filter((x) => x.slug !== h.slug);

  return (
    <article>
      <JsonLd data={[
        jsonLdHealth(h, h.description || `${h.name} tại ${oldAddress}`, unit?.name),
        jsonLdBreadcrumb([
          { name: "Trang chủ", path: "/" },
          { name: "Y tế", path: "/y-te" },
          { name: h.name, path: `/y-te/${slug}` },
        ]),
      ]} />
      <section className="qp-pagehero qp-lf-hero is-nhat-duoc" aria-labelledby="h-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-lf-hero__art" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2 5 4-12 2 7h6" /></svg>
        </span>
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <Link href="/y-te">Y tế</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">{h.name}</span>
          </nav>
          <div className="qp-lf-detail__badges">
            <span className="qp-tag-cat">{h.typeLabel}</span>
            <span className={`qp-health-own is-${h.ownership}`}>{ownMap[h.ownership] ?? h.ownership}</span>
            {h.emergency && <span className="qp-health-emergency">Cấp cứu 24/7</span>}
            {h.verified && <span className="qp-lf-status" style={{ background: "rgba(0,169,143,0.13)", color: "var(--color-teal-dark)" }}>✓ Đã xác minh</span>}
          </div>
          <h1 id="h-title" className="type-h1" style={{ margin: "var(--space-3) 0 var(--space-2)" }}>{h.name}</h1>
          <p className="qp-pagehero__lead">{oldAddress}</p>
        </div>
      </section>

      <div className="container-wide qp-lf-body">
        <div className="qp-article-layout is-lf">
          <div className="qp-lf-main">
            <div className="qp-prose">
              <h2>Giới thiệu</h2>
              <p>{h.description || `${h.name} — cơ sở ${h.typeLabel.toLowerCase()} tại ${unit?.name ?? h.wardSlug}.`}</p>
              {h.specialties && <p><b>Chuyên khoa:</b> {h.specialties}</p>}
              <h2>Địa chỉ</h2>
              <p><b>Địa chỉ cũ:</b> {oldAddress}</p>
              {newAddress && <p><b>Địa chỉ mới (sau sáp nhập 2025):</b> {newAddress}</p>}
              {!h.verified && <p className="type-body-small text-muted">* Thông tin tổng hợp theo quy ước, cần đối chiếu với cơ quan y tế.</p>}
            </div>

            <AffiliateCTA />
            <DetailSocial type="y-te" slug={slug} title={h.name} />
          </div>

          <aside className="qp-lf-aside">
            <div className="qp-lf-infocard qp-lf-infocard--cta">
              {h.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.image} alt={h.name} style={{ width: "100%", borderRadius: "var(--radius-md)", marginBottom: "var(--space-4)", objectFit: "cover", maxHeight: 200 }} />
              )}
              <div className="qp-lf-infocard__title">Thông tin & liên hệ</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Loại cơ sở</span><b>{h.typeLabel}</b></div>
                <div className="qp-lf-spec__row"><span>Loại hình</span><b>{ownMap[h.ownership] ?? h.ownership}</b></div>
                <div className="qp-lf-spec__row"><span>Địa điểm</span><b>{unit?.name ?? h.wardSlug}{unit?.newCommune && <><br /><span className="qp-lf-spec__sub">(Xã mới: {unit.newCommune})</span></>}</b></div>
                {h.hours && <div className="qp-lf-spec__row"><span>Giờ làm việc</span><b>{h.hours}</b></div>}
                {h.beds ? <div className="qp-lf-spec__row"><span>Quy mô</span><b>{h.beds} giường</b></div> : null}
                {h.director && <div className="qp-lf-spec__row"><span>Phụ trách</span><b>{h.director}</b></div>}
                {h.foundedYear && <div className="qp-lf-spec__row"><span>Thành lập</span><b>{h.foundedYear}</b></div>}
                {h.phone && <div className="qp-lf-spec__row"><span>Điện thoại</span><b><a href={`tel:${h.phone.replace(/\s/g, "")}`}>{h.phone}</a></b></div>}
                {h.email && <div className="qp-lf-spec__row"><span>Email</span><b><a href={`mailto:${h.email}`}>{h.email}</a></b></div>}
              </div>
              {h.phone && <a href={`tel:${h.phone.replace(/\s/g, "")}`} className="qp-btn-primary qp-btn-block mt-6">Gọi {h.phone}</a>}
              {h.website && <a href={h.website} target="_blank" rel="noopener noreferrer" className="qp-btn-secondary qp-btn-block mt-3">Website</a>}
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="qp-lf-related">
            <header className="qp-newsgrid-head"><span className="type-tag qp-sechead__eyebrow">Cùng {unit?.name ?? "xã"}</span><h2 className="type-h2">Cơ sở y tế khác trong xã</h2></header>
            <div className="qp-school-grid">
              {related.map((r) => (
                <article className="qp-mesh-card qp-mesh-card--text qp-school-card" key={r.slug}>
                  <div className="qp-mesh-card__body">
                    <div className="qp-school-card__top"><span className="qp-tag-cat">{r.typeLabel}</span><span className={`qp-health-own is-${r.ownership}`}>{ownMap[r.ownership] ?? r.ownership}</span></div>
                    <Link className="qp-school-card__name" href={`/y-te/${r.slug}`}>{r.name}</Link>
                    {r.phone && <div className="qp-school-card__row" style={{ marginTop: 6 }}>☎ {r.phone}</div>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
