import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTransitBySlug, relatedTransit } from "@/lib/transit";
import { DetailSocial } from "@/components/common/DetailSocial";
import { buildMetadata, jsonLdTransit, jsonLdBreadcrumb } from "@/lib/seo";
import { applySeo } from "@/lib/seo-fields";
import { JsonLd } from "@/components/common/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTransitBySlug(slug);
  if (!t) return { title: "Không tìm thấy tuyến" };
  return buildMetadata({
    ...applySeo({
      title: `${t.name} — Giao thông Quỳnh Phụ`,
      description: `Tuyến ${t.typeLabel}: ${t.origin} → ${t.destination}. ${t.fare ? "Giá vé " + t.fare + ". " : ""}${t.frequency ?? ""}`,
    }, t.seo),
    path: `/giao-thong/${slug}`,
    modifiedTime: t.updatedAt?.toISOString(),
  });
}

export default async function TransitDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTransitBySlug(slug);
  if (!t || !t.active) notFound();

  const related = await relatedTransit(slug, t.type, 3);

  return (
    <article>
      <JsonLd data={[
        jsonLdTransit(t, `Tuyến ${t.typeLabel}: ${t.origin} → ${t.destination}.`),
        jsonLdBreadcrumb([
          { name: "Trang chủ", path: "/" },
          { name: "Giao thông", path: "/giao-thong" },
          { name: t.name, path: `/giao-thong/${slug}` },
        ]),
      ]} />
      <section className="qp-pagehero qp-lf-hero is-nhat-duoc" aria-labelledby="t-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-lf-hero__art" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="13" rx="2" /><path d="M4 11h16M8 17v2M16 17v2" /><circle cx="8.5" cy="14" r="1" /><circle cx="15.5" cy="14" r="1" /></svg>
        </span>
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <Link href="/giao-thong">Giao thông</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">{t.name}</span>
          </nav>
          <div className="qp-lf-detail__badges">
            <span className="qp-tag-cat">{t.typeLabel}</span>
            {t.operator && <span className="qp-job-type">{t.operator}</span>}
            {t.verified && <span className="qp-lf-status" style={{ background: "rgba(0,169,143,0.13)", color: "var(--color-teal-dark)" }}>✓ Đã xác minh</span>}
          </div>
          <h1 id="t-title" className="type-h1" style={{ margin: "var(--space-3) 0 var(--space-2)" }}>{t.name}</h1>
          <p className="qp-pagehero__lead">{t.origin} → {t.destination}</p>
        </div>
      </section>

      <div className="container-wide qp-lf-body">
        <div className="qp-article-layout is-lf">
          <div className="qp-lf-main">
            <div className="qp-prose">
              <h2>Lộ trình</h2>
            </div>
            <div className="qp-route">
              <span className="qp-route__bus" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M4 4h13a3 3 0 0 1 3 3v7h1.5a.5.5 0 0 1 .5.5V16a1 1 0 0 1-1 1h-1a2.5 2.5 0 0 1-5 0H9a2.5 2.5 0 0 1-5 0H3a1 1 0 0 1-1-1V7a3 3 0 0 1 2-2.83zM4 8v3h6V7H5a1 1 0 0 0-1 1zm8-1v4h6V7a1 1 0 0 0-1-1h-5zM6.5 15A1.5 1.5 0 1 0 8 16.5 1.5 1.5 0 0 0 6.5 15zm10 0A1.5 1.5 0 1 0 18 16.5 1.5 1.5 0 0 0 16.5 15z" /></svg>
              </span>
              <ol className="qp-route__stops">
                {t.stops.map((s, i) => (
                  <li key={i} className={`qp-route__stop${i === 0 || i === t.stops.length - 1 ? " is-end" : ""}`}>
                    <span className="qp-route__dot" />
                    <span className="qp-route__name">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            {t.note && (
              <div className="qp-alert is-warning mt-6" role="note">
                <div className="qp-alert__body"><strong>Lưu ý:</strong> {t.note}</div>
              </div>
            )}

            <DetailSocial type="giao-thong" slug={slug} title={t.name} />
          </div>

          <aside className="qp-lf-aside">
            <div className="qp-lf-infocard qp-lf-infocard--cta">
              <div className="qp-lf-infocard__title">Thông tin tuyến</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Loại tuyến</span><b>{t.typeLabel}</b></div>
                {t.operator && <div className="qp-lf-spec__row"><span>Nhà xe</span><b>{t.operator}</b></div>}
                {t.fare && <div className="qp-lf-spec__row"><span>Giá vé</span><b style={{ color: "var(--color-teal-dark)" }}>{t.fare}</b></div>}
                {t.frequency && <div className="qp-lf-spec__row"><span>Giờ chạy</span><b>{t.frequency}</b></div>}
                {t.duration && <div className="qp-lf-spec__row"><span>Thời gian</span><b>{t.duration}</b></div>}
                {t.distance && <div className="qp-lf-spec__row"><span>Quãng đường</span><b>{t.distance}</b></div>}
                {t.phone && <div className="qp-lf-spec__row"><span>Điện thoại</span><b><a href={`tel:${t.phone.replace(/\s/g, "")}`}>{t.phone}</a></b></div>}
              </div>
              {t.phone && <a href={`tel:${t.phone.replace(/\s/g, "")}`} className="qp-btn-primary qp-btn-block mt-6">Gọi đặt vé</a>}
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="qp-lf-related">
            <header className="qp-newsgrid-head"><span className="type-tag qp-sechead__eyebrow">Cùng loại</span><h2 className="type-h2">Tuyến liên quan</h2></header>
            <div className="qp-job-grid">
              {related.map((r) => (
                <article className="qp-job-card" key={r.slug}>
                  <div className="qp-job-card__head">
                    <span className="qp-job-card__logo" aria-hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="13" rx="2" /><path d="M4 11h16M8 17v2M16 17v2" /><circle cx="8.5" cy="14" r="1" /><circle cx="15.5" cy="14" r="1" /></svg></span>
                    <div className="qp-job-card__head-main">
                      <Link href={`/giao-thong/${r.slug}`} className="qp-job-card__title">{r.name}</Link>
                      <div className="qp-transit-route">{r.origin} → {r.destination}</div>
                    </div>
                  </div>
                  {r.fare && <div className="qp-job-card__meta"><span>🎫 {r.fare}</span></div>}
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
