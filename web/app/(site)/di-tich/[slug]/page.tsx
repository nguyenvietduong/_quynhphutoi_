import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRelicBySlug, relatedRelics, RANKING_LABEL } from "@/lib/relics";
import { getAdminUnitBySlug, fullOldAddress } from "@/lib/admin-units";
import { ImageGallery } from "@/components/common/ImageGallery";
import { DetailSocial } from "@/components/common/DetailSocial";
import { buildMetadata, jsonLdRelic, jsonLdBreadcrumb } from "@/lib/seo";
import { applySeo } from "@/lib/seo-fields";
import { JsonLd } from "@/components/common/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRelicBySlug(slug);
  if (!r) return { title: "Không tìm thấy" };
  return buildMetadata({
    ...applySeo({
      title: `${r.name} — Di tích Quỳnh Phụ`,
      description: r.description || `${r.name} (${r.typeLabel}) tại Quỳnh Phụ.`,
      image: r.images?.[0],
    }, r.seo),
    path: `/di-tich/${slug}`,
    modifiedTime: r.updatedAt?.toISOString(),
  });
}

export default async function RelicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRelicBySlug(slug);
  if (!r || !r.active) notFound();

  const unit = await getAdminUnitBySlug(r.wardSlug);
  const oldAddress = fullOldAddress(unit ?? undefined, r.address);
  const newAddress = unit ? `Xã ${unit.newCommune}, ${unit.newProvince}` : "";
  const related = await relatedRelics(slug, r.type, 3);

  return (
    <article>
      <JsonLd data={[
        jsonLdRelic(r, r.description || `${r.name} (${r.typeLabel}) tại Quỳnh Phụ.`, unit?.name),
        jsonLdBreadcrumb([
          { name: "Trang chủ", path: "/" },
          { name: "Di tích", path: "/di-tich" },
          { name: r.name, path: `/di-tich/${slug}` },
        ]),
      ]} />
      <section className="qp-pagehero qp-lf-hero is-nhat-duoc" aria-labelledby="r-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-lf-hero__art" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M4 21V10l8-5 8 5v11M9 21v-6h6v6M7 10v3M12 10v3M17 10v3" /></svg>
        </span>
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <Link href="/di-tich">Di tích</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">{r.name}</span>
          </nav>
          <div className="qp-lf-detail__badges">
            <span className="qp-tag-cat">{r.typeLabel}</span>
            {r.ranking && <span className="qp-job-type">{RANKING_LABEL[r.ranking]}</span>}
            {r.featured && <span className="qp-badge-g4">TIÊU BIỂU</span>}
            {r.verified && <span className="qp-lf-status" style={{ background: "rgba(0,169,143,0.13)", color: "var(--color-teal-dark)" }}>✓ Đã xác minh</span>}
          </div>
          <h1 id="r-title" className="type-h1" style={{ margin: "var(--space-3) 0 var(--space-2)" }}>{r.name}</h1>
          <p className="qp-pagehero__lead">{oldAddress || r.typeLabel}</p>
        </div>
      </section>

      <div className="container-wide qp-lf-body">
        <div className="qp-article-layout is-lf">
          <div className="qp-lf-main">
            <ImageGallery images={r.images ?? []} alt={r.name} />
            <div className="qp-prose">
              <h2>Giới thiệu</h2>
              <p>{r.description || `${r.name} — ${r.typeLabel} tại ${unit?.name ?? r.wardSlug}.`}</p>
              {r.worship && (
                <>
                  <h2>Thờ tự</h2>
                  <p>{r.worship}</p>
                </>
              )}
              {r.festival && (
                <>
                  <h2>Lễ hội</h2>
                  <p>{r.festival}</p>
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

            <DetailSocial type="di-tich" slug={slug} title={r.name} />
          </div>

          <aside className="qp-lf-aside">
            <div className="qp-lf-infocard qp-lf-infocard--cta">
              <div className="qp-lf-infocard__title">Thông tin di tích</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Loại</span><b>{r.typeLabel}</b></div>
                {r.ranking && <div className="qp-lf-spec__row"><span>Xếp hạng</span><b style={{ color: "var(--color-teal-dark)" }}>{RANKING_LABEL[r.ranking]}</b></div>}
                {r.recognizedYear ? <div className="qp-lf-spec__row"><span>Năm xếp hạng</span><b>{r.recognizedYear}</b></div> : null}
                {r.era && <div className="qp-lf-spec__row"><span>Niên đại</span><b>{r.era}</b></div>}
                {r.worship && <div className="qp-lf-spec__row"><span>Thờ tự</span><b>{r.worship}</b></div>}
                {unit && <div className="qp-lf-spec__row"><span>Địa điểm</span><b>{unit.name}{unit.newCommune && <><br /><span className="qp-lf-spec__sub">(Xã mới: {unit.newCommune})</span></>}</b></div>}
                {r.festival && <div className="qp-lf-spec__row"><span>Lễ hội</span><b>{r.festival}</b></div>}
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="qp-lf-related">
            <header className="qp-newsgrid-head"><span className="type-tag qp-sechead__eyebrow">Cùng loại</span><h2 className="type-h2">{r.typeLabel} khác</h2></header>
            <div className="qp-job-grid">
              {related.map((x) => (
                <article className="qp-job-card" key={x.slug}>
                  <div className="qp-job-card__head">
                    <span className="qp-job-card__logo" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M4 21V10l8-5 8 5v11M9 21v-6h6v6" /></svg>
                    </span>
                    <div className="qp-job-card__head-main">
                      <Link href={`/di-tich/${x.slug}`} className="qp-job-card__title">{x.name}</Link>
                      {x.era && <div className="qp-job-card__company">{x.era}</div>}
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
