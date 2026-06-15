import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchoolBySlug, listByWard, SCHOOL_LEVELS, type SchoolDoc, type SchoolLevel } from "@/lib/schools";
import { getAdminUnitBySlug, fullOldAddress } from "@/lib/admin-units";
import { DetailSocial } from "@/components/common/DetailSocial";
import { buildMetadata, jsonLdSchool, jsonLdBreadcrumb } from "@/lib/seo";
import { applySeo } from "@/lib/seo-fields";
import { JsonLd } from "@/components/common/JsonLd";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<SchoolDoc["type"], string> = {
  "cong-lap": "Công lập", "dan-lap": "Dân lập", "tu-thuc": "Tư thục", "gdnn-gdtx": "GDNN-GDTX",
};
const levelsText = (levels: SchoolLevel[]) =>
  levels.map((l) => SCHOOL_LEVELS.find((x) => x.slug === l)?.label ?? l).join(", ");

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

  const unit = await getAdminUnitBySlug(s.wardSlug);
  const oldAddress = fullOldAddress(unit ?? undefined, s.address);
  const newAddress = unit ? `Xã ${unit.newCommune}, ${unit.newProvince}` : "";
  const related = (await listByWard(s.wardSlug)).filter((x) => x.slug !== s.slug);

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
      <section className="qp-pagehero qp-lf-hero is-nhat-duoc" aria-labelledby="sc-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-lf-hero__art" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" /><path d="M22 10v6" /></svg>
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
            <span className={`qp-school-type is-${s.type}`}>{TYPE_LABEL[s.type]}</span>
            {s.verified && <span className="qp-lf-status" style={{ background: "rgba(0,169,143,0.13)", color: "var(--color-teal-dark)" }}>✓ Đã xác minh</span>}
          </div>
          <h1 id="sc-title" className="type-h1" style={{ margin: "var(--space-3) 0 var(--space-2)" }}>{s.name}</h1>
          <p className="qp-pagehero__lead">{oldAddress}</p>
        </div>
      </section>

      <div className="container-wide qp-lf-body">
        <div className="qp-article-layout is-lf">
          <div className="qp-lf-main">
            <div className="qp-prose">
              <h2>Giới thiệu</h2>
              <p>{s.description || `${s.name} là cơ sở giáo dục cấp ${s.levelLabel.toLowerCase()} thuộc ${unit?.name ?? s.wardSlug}, ${unit?.district ?? ""}. Trường giảng dạy: ${levelsText(s.levels)}.`}</p>
              <h2>Địa chỉ</h2>
              <p><b>Địa chỉ cũ:</b> {oldAddress}</p>
              {newAddress && <p><b>Địa chỉ mới (sau sáp nhập 2025):</b> {newAddress}</p>}
              {s.foundedYear && <p><b>Năm thành lập:</b> {s.foundedYear}</p>}
              {!s.verified && <p className="type-body-small text-muted">* Thông tin tổng hợp theo quy ước, cần đối chiếu với danh sách chính thức của ngành Giáo dục.</p>}
            </div>

            <DetailSocial type="truong-hoc" slug={slug} title={s.name} />
          </div>

          <aside className="qp-lf-aside">
            <div className="qp-lf-infocard qp-lf-infocard--cta">
              <div className="qp-lf-infocard__title">Thông tin trường</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Cấp học</span><b>{levelsText(s.levels)}</b></div>
                <div className="qp-lf-spec__row"><span>Loại hình</span><b>{TYPE_LABEL[s.type]}</b></div>
                <div className="qp-lf-spec__row"><span>Địa điểm</span><b>{unit?.name ?? s.wardSlug}{unit?.newCommune && <><br /><span className="qp-lf-spec__sub">(Xã mới: {unit.newCommune})</span></>}</b></div>
                {s.principal && <div className="qp-lf-spec__row"><span>Hiệu trưởng</span><b>{s.principal}</b></div>}
                {s.foundedYear && <div className="qp-lf-spec__row"><span>Thành lập</span><b>{s.foundedYear}</b></div>}
                {s.phone && <div className="qp-lf-spec__row"><span>Điện thoại</span><b><a href={`tel:${s.phone}`}>{s.phone}</a></b></div>}
                {s.email && <div className="qp-lf-spec__row"><span>Email</span><b><a href={`mailto:${s.email}`}>{s.email}</a></b></div>}
              </div>
              {s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" className="qp-btn-primary qp-btn-block mt-6">Truy cập website</a>}
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="qp-lf-related">
            <header className="qp-newsgrid-head">
              <span className="type-tag qp-sechead__eyebrow">Cùng {unit?.name ?? "xã"}</span>
              <h2 className="type-h2">Trường khác trong xã</h2>
            </header>
            <div className="qp-school-grid">
              {related.map((r) => (
                <article className="qp-mesh-card qp-mesh-card--text qp-school-card" key={r.slug}>
                  <div className="qp-mesh-card__body">
                    <div className="qp-school-card__top">
                      <span className="qp-tag-cat">{r.levelLabel}</span>
                      <span className={`qp-school-type is-${r.type}`}>{TYPE_LABEL[r.type]}</span>
                    </div>
                    <Link className="qp-school-card__name" href={`/truong-hoc/${r.slug}`}>{r.name}</Link>
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
