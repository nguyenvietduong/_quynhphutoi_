import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketBySlug, relatedMarket } from "@/lib/market";
import { getAdminUnitBySlug, fullOldAddress } from "@/lib/admin-units";
import { DetailSocial } from "@/components/common/DetailSocial";
import { buildMetadata, jsonLdMarket, jsonLdBreadcrumb } from "@/lib/seo";
import { applySeo } from "@/lib/seo-fields";
import { JsonLd } from "@/components/common/JsonLd";
import { AffiliateCTA } from "@/components/common/AffiliateCTA";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = await getMarketBySlug(slug);
  if (!m) return { title: "Không tìm thấy" };
  return buildMetadata({
    ...applySeo({
      title: `${m.name} — Chợ Quỳnh Phụ`,
      description: m.description || `${m.name} (${m.categoryLabel}) tại Quỳnh Phụ.`,
    }, m.seo),
    path: `/cho/${slug}`,
    modifiedTime: m.updatedAt?.toISOString(),
  });
}

export default async function MarketDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await getMarketBySlug(slug);
  if (!m || !m.active) notFound();

  const unit = await getAdminUnitBySlug(m.wardSlug);
  const oldAddress = fullOldAddress(unit ?? undefined, m.address);
  const newAddress = unit ? `Xã ${unit.newCommune}, ${unit.newProvince}` : "";
  const related = await relatedMarket(slug, m.category, 3);

  return (
    <article>
      <JsonLd data={[
        jsonLdMarket(m, m.description || `${m.name} (${m.categoryLabel}) tại Quỳnh Phụ.`, unit?.name),
        jsonLdBreadcrumb([
          { name: "Trang chủ", path: "/" },
          { name: "Chợ", path: "/cho" },
          { name: m.name, path: `/cho/${slug}` },
        ]),
      ]} />
      <section className="qp-pagehero qp-lf-hero is-nhat-duoc" aria-labelledby="m-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-lf-hero__art" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M3 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 3 0" /></svg>
        </span>
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <Link href="/cho">Chợ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">{m.name}</span>
          </nav>
          <div className="qp-lf-detail__badges">
            <span className="qp-tag-cat">{m.categoryLabel}</span>
            {m.featured && <span className="qp-badge-g4">NỔI BẬT</span>}
            {m.verified && <span className="qp-lf-status" style={{ background: "rgba(0,169,143,0.13)", color: "var(--color-teal-dark)" }}>✓ Đã xác minh</span>}
          </div>
          <h1 id="m-title" className="type-h1" style={{ margin: "var(--space-3) 0 var(--space-2)" }}>{m.name}</h1>
          <p className="qp-pagehero__lead">{oldAddress || m.categoryLabel}</p>
        </div>
      </section>

      <div className="container-wide qp-lf-body">
        <div className="qp-article-layout is-lf">
          <div className="qp-lf-main">
            <div className="qp-prose">
              <h2>Giới thiệu</h2>
              <p>{m.description || `${m.name} — ${m.categoryLabel} tại ${unit?.name ?? m.wardSlug}.`}</p>
              {m.category === "cho-phien" && m.schedule && (
                <>
                  <h2>Lịch họp chợ</h2>
                  <p>{m.schedule}</p>
                </>
              )}
              {oldAddress && (
                <>
                  <h2>Địa chỉ</h2>
                  <p><b>Địa chỉ cũ:</b> {oldAddress}</p>
                  {newAddress && <p><b>Địa chỉ mới (sau sáp nhập 2025):</b> {newAddress}</p>}
                </>
              )}
            </div>

            <AffiliateCTA />
            <DetailSocial type="cho" slug={slug} title={m.name} />
          </div>

          <aside className="qp-lf-aside">
            <div className="qp-lf-infocard qp-lf-infocard--cta">
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt={m.name} style={{ width: "100%", borderRadius: "var(--radius-md)", marginBottom: "var(--space-4)", objectFit: "cover", maxHeight: 200 }} />
              )}
              <div className="qp-lf-infocard__title">Thông tin</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Mảng</span><b>{m.categoryLabel}</b></div>
                {unit && <div className="qp-lf-spec__row"><span>Địa điểm</span><b>{unit.name}{unit.newCommune && <><br /><span className="qp-lf-spec__sub">(Xã mới: {unit.newCommune})</span></>}</b></div>}
                {m.schedule && <div className="qp-lf-spec__row"><span>Lịch họp</span><b>{m.schedule}</b></div>}
                {m.priceText && <div className="qp-lf-spec__row"><span>Giá tham khảo</span><b style={{ color: "var(--color-teal-dark)" }}>{m.priceText}{m.unit ? `/${m.unit}` : ""}</b></div>}
                {m.contactName && <div className="qp-lf-spec__row"><span>Liên hệ</span><b>{m.contactName}</b></div>}
                {m.contactPhone && <div className="qp-lf-spec__row"><span>Điện thoại</span><b><a href={`tel:${m.contactPhone.replace(/\s/g, "")}`}>{m.contactPhone}</a></b></div>}
              </div>
              {m.contactPhone && <a href={`tel:${m.contactPhone.replace(/\s/g, "")}`} className="qp-btn-primary qp-btn-block mt-6">Gọi liên hệ</a>}
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="qp-lf-related">
            <header className="qp-newsgrid-head"><span className="type-tag qp-sechead__eyebrow">Cùng mảng</span><h2 className="type-h2">{m.categoryLabel} khác</h2></header>
            <div className="qp-job-grid">
              {related.map((r) => (
                <article className="qp-job-card" key={r.slug}>
                  <div className="qp-job-card__head">
                    <span className="qp-market-logo is-cho-phien" aria-hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /></svg></span>
                    <div className="qp-job-card__head-main">
                      <Link href={`/cho/${r.slug}`} className="qp-job-card__title">{r.name}</Link>
                      {r.priceText && <div className="qp-job-card__company">💰 {r.priceText}{r.unit ? `/${r.unit}` : ""}</div>}
                    </div>
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
