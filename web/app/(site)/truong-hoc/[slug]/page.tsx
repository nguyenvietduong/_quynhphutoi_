import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchoolBySlug, listByWard } from "@/lib/schools";
import { categoryLabelMap } from "@/lib/categories";
import { getAdminUnitBySlug, fullOldAddress } from "@/lib/admin-units";
import { DetailSocial } from "@/components/common/DetailSocial";
import { buildMetadata, jsonLdSchool, jsonLdBreadcrumb } from "@/lib/seo";
import { applySeo } from "@/lib/seo-fields";
import { JsonLd } from "@/components/common/JsonLd";
import { AffiliateCTA } from "@/components/common/AffiliateCTA";

export const dynamic = "force-dynamic";

const levelsText = (levels: string[], labels: Record<string, string>) =>
  levels.map((l) => labels[l] ?? l).join(", ");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSchoolBySlug(slug);
  if (!s) return { title: "Không tìm thấy trường" };
  const u = await getAdminUnitBySlug(s.wardSlug);
  return buildMetadata({
    ...applySeo({
      title: `${s.name} — Trường học Quỳnh Phụ`,
      description: s.description || `${s.name} tại ${fullOldAddress(u ?? undefined, s.address)}.`,
    }, s.seo),
    path: `/truong-hoc/${slug}`,
    modifiedTime: s.updatedAt?.toISOString(),
  });
}

export default async function SchoolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSchoolBySlug(slug);
  if (!s || !s.active) notFound();

  const [unit, related, levelLabels, typeLabels] = await Promise.all([
    getAdminUnitBySlug(s.wardSlug),
    listByWard(s.wardSlug),
    categoryLabelMap("truong-hoc"),
    categoryLabelMap("loai-hinh-truong"),
  ]);
  const oldAddress = fullOldAddress(unit ?? undefined, s.address);
  const newAddress = unit ? `Xã ${unit.newCommune}, ${unit.newProvince}` : "";
  const relatedList = related.filter((x) => x.slug !== s.slug);
  const typeName = (t: string) => typeLabels[t] ?? t;
  const hasContact = !!(s.phone || s.email || s.website);

  return (
    <article>
      <JsonLd data={[
        jsonLdSchool(s, s.description || `${s.name} tại ${oldAddress}`, unit?.name),
        jsonLdBreadcrumb([
          { name: "Trang chủ", path: "/" },
          { name: "Trường học", path: "/truong-hoc" },
          { name: s.name, path: `/truong-hoc/${slug}` },
        ]),
      ]} />

      {/* ── Hero ── */}
      <section className="qp-pagehero qp-lf-hero is-nhat-duoc" aria-labelledby="sc-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-lf-hero__art" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10 12 5 2 10l10 5 10-5z" />
            <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
            <path d="M22 10v6" />
          </svg>
        </span>
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <Link href="/truong-hoc">Trường học</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">{s.name}</span>
          </nav>
          <div className="qp-lf-detail__badges">
            <span className="qp-tag-cat">{s.levelLabel}</span>
            <span className={`qp-school-type is-${s.type}`}>{typeName(s.type)}</span>
            {s.verified && (
              <span className="qp-lf-status" style={{ background: "rgba(0,169,143,0.13)", color: "var(--color-teal-dark)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Đã xác minh
              </span>
            )}
          </div>
          <h1 id="sc-title" className="type-h1" style={{ margin: "var(--space-3) 0 var(--space-2)" }}>{s.name}</h1>
          <p className="qp-pagehero__lead">
            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" style={{ display: "inline", verticalAlign: "middle", marginRight: 5, opacity: 0.7 }} aria-hidden="true">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {oldAddress}
          </p>
        </div>
      </section>

      {/* ── Ảnh trường (full-width banner, nếu có) ── */}
      {s.image && (
        <div className="container-wide" style={{ marginTop: "var(--space-6)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.image}
            alt={s.name}
            style={{ width: "100%", height: 340, objectFit: "cover", display: "block", borderRadius: "var(--radius-lg)", boxShadow: "0 4px 24px -8px rgba(6,35,64,0.18)" }}
          />
        </div>
      )}

      {/* ── Body ── */}
      <div className="container-wide qp-lf-body">
        <div className="qp-article-layout is-lf">

          {/* Cột chính */}
          <div className="qp-lf-main">
            <div className="qp-prose">
              <h2>Giới thiệu</h2>
              <p>{s.description || `${s.name} là cơ sở giáo dục cấp ${s.levelLabel.toLowerCase()} thuộc ${unit?.name ?? s.wardSlug}, ${unit?.district ?? ""}. Trường giảng dạy: ${levelsText(s.levels, levelLabels)}.`}</p>
              <h2>Địa chỉ</h2>
              <p><b>Địa chỉ cũ:</b> {oldAddress}</p>
              {newAddress && <p><b>Địa chỉ mới (sau sáp nhập 2025):</b> {newAddress}</p>}
              {s.foundedYear && <p><b>Năm thành lập:</b> {s.foundedYear}</p>}
              {!s.verified && <p className="type-body-small text-muted">* Thông tin tổng hợp theo quy ước, cần đối chiếu với danh sách chính thức của ngành Giáo dục.</p>}
            </div>

            {/* Thanh liên hệ nhanh */}
            {hasContact && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 10,
                background: "var(--color-navy-pale)",
                border: "1px solid var(--color-gray-border)",
                borderRadius: "var(--radius-md)",
                padding: "14px 18px",
                margin: "var(--space-6) 0",
              }}>
                {s.phone && (
                  <a href={`tel:${s.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--color-teal-dark)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    {s.phone}
                  </a>
                )}
                {s.email && (
                  <a href={`mailto:${s.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--color-teal-dark)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    {s.email}
                  </a>
                )}
                {s.website && (
                  <a href={s.website} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--color-teal-dark)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                      <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                    </svg>
                    {s.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            )}

            <AffiliateCTA />
            <DetailSocial type="truong-hoc" slug={slug} title={s.name} />
          </div>

          {/* Sidebar thông tin */}
          <aside className="qp-lf-aside">
            <div className="qp-lf-infocard qp-lf-infocard--cta">
              <div className="qp-lf-infocard__title">Thông tin trường</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Cấp học</span><b>{levelsText(s.levels, levelLabels)}</b></div>
                <div className="qp-lf-spec__row"><span>Loại hình</span><b>{typeName(s.type)}</b></div>
                <div className="qp-lf-spec__row">
                  <span>Địa điểm</span>
                  <b>
                    {unit?.name ?? s.wardSlug}
                    {unit?.newCommune && <><br /><span className="qp-lf-spec__sub">Xã mới: {unit.newCommune}</span></>}
                  </b>
                </div>
                {s.principal && <div className="qp-lf-spec__row"><span>Hiệu trưởng</span><b>{s.principal}</b></div>}
                {s.foundedYear && <div className="qp-lf-spec__row"><span>Thành lập</span><b>{s.foundedYear}</b></div>}
                {s.phone && <div className="qp-lf-spec__row"><span>Điện thoại</span><b><a href={`tel:${s.phone}`}>{s.phone}</a></b></div>}
                {s.email && <div className="qp-lf-spec__row"><span>Email</span><b><a href={`mailto:${s.email}`}>{s.email}</a></b></div>}
                {s.verified && (
                  <div className="qp-lf-spec__row">
                    <span>Xác minh</span>
                    <b style={{ color: "var(--color-teal-dark)", display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Đã xác minh
                    </b>
                  </div>
                )}
              </div>
              {s.website && (
                <a href={s.website} target="_blank" rel="noopener noreferrer" className="qp-btn-primary qp-btn-block mt-6">Truy cập website</a>
              )}
            </div>
          </aside>
        </div>

        {/* Trường cùng xã */}
        {relatedList.length > 0 && (
          <div className="qp-lf-related">
            <header className="qp-newsgrid-head">
              <span className="type-tag qp-sechead__eyebrow">Cùng {unit?.name ?? "xã"}</span>
              <h2 className="type-h2">Trường khác trong xã</h2>
            </header>
            <div className="qp-school-grid">
              {relatedList.map((r) => (
                <article className="qp-mesh-card qp-mesh-card--text qp-school-card" key={r.slug}>
                  <div className="qp-mesh-card__body">
                    <div className="qp-school-card__top">
                      <span className="qp-tag-cat">{r.levelLabel}</span>
                      <span className={`qp-school-type is-${r.type}`}>{typeName(r.type)}</span>
                    </div>
                    <Link className="qp-school-card__name" href={`/truong-hoc/${r.slug}`}>{r.name}</Link>
                    {r.principal && (
                      <div className="qp-school-card__row">
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        HT: {r.principal}
                      </div>
                    )}
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
