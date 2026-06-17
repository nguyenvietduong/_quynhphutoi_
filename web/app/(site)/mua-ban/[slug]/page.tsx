import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassifiedBySlug, incrementViews, relatedClassifieds } from "@/lib/classifieds";
import { categoryLabelMap } from "@/lib/categories";
import { getCurrentUser } from "@/lib/admin";
import { isStaff } from "@/lib/users";
import { stripHtml } from "@/lib/strip-html";
import { getAdminUnitsMap } from "@/lib/admin-units";
import { ClassifiedActions } from "@/components/classifieds/ClassifiedActions";
import { ImageGallery } from "@/components/common/ImageGallery";
import { DetailSocial } from "@/components/common/DetailSocial";
import { MapEmbed } from "@/components/common/MapEmbed";
import { formatDate } from "@/lib/datetime";
import { buildMetadata, jsonLdClassified, jsonLdBreadcrumb } from "@/lib/seo";
import { applySeo } from "@/lib/seo-fields";
import { JsonLd } from "@/components/common/JsonLd";
import { AffiliateCTA } from "@/components/common/AffiliateCTA";

export const dynamic = "force-dynamic";

const STATUS = { open: "Đang rao", sold: "Đã bán", closed: "Đã đóng" } as const;

function initials(name: string) { return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(-2).join("").toUpperCase() || "?"; }
// Ẩn bớt SĐT: chỉ hiện 3 số đầu, phần còn lại thay bằng dấu *.
function maskPhone(p: string) { const d = p.replace(/\s+/g, ""); return d.length <= 3 ? d : d.slice(0, 3) + "*".repeat(d.length - 3); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await getClassifiedBySlug(slug);
  if (!a) return { title: "Không tìm thấy tin" };
  return buildMetadata({
    ...applySeo(
      {
        title: `${a.title} — ${a.priceText}`,
        description: stripHtml(a.description).slice(0, 160),
        image: a.images?.[0],
      },
      a.seo,
    ),
    path: `/mua-ban/${slug}`,
    type: "article",
    publishedTime: a.createdAt?.toISOString(),
    modifiedTime: a.updatedAt?.toISOString(),
    noindex: !a.approved || a.seo?.noindex,
  });
}

export default async function ClassifiedDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getClassifiedBySlug(slug);
  if (!a || !a.active) notFound();

  const user = await getCurrentUser();
  const isOwner = !!user && user._id?.toString() === a.postedBy.toString();
  if (!a.approved && !isOwner && !isStaff(user)) notFound();
  if (a.approved && !isOwner) await incrementViews(slug);

  const showPhone = !a.contact.hidePhone || isOwner;
  const [related, units, condMap] = await Promise.all([
    a.approved ? relatedClassifieds(slug, a.category, 3) : Promise.resolve([]),
    getAdminUnitsMap(),
    categoryLabelMap("tinh-trang"),
  ]);
  const unit = units.get(a.location.wardSlug);
  const wardName = unit?.name ?? a.location.wardSlug;
  const lead = stripHtml(a.description).slice(0, 200);

  return (
    <article>
      {a.approved && (
        <JsonLd data={[
          jsonLdClassified(a, lead),
          jsonLdBreadcrumb([
            { name: "Trang chủ", path: "/" },
            { name: "Mua bán", path: "/mua-ban" },
            { name: a.title, path: `/mua-ban/${slug}` },
          ]),
        ]} />
      )}
      <section className="qp-pagehero qp-lf-hero is-nhat-duoc" aria-labelledby="a-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-lf-hero__art" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 13.4 12 22l-9-9V3h10l8.6 8.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
        </span>
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <Link href="/mua-ban">Mua bán</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">{a.title}</span>
          </nav>
          <div className="qp-lf-detail__badges">
            <span className="qp-tag-cat">{a.categoryLabel}</span>
            {a.condition && <span className="qp-job-type">{condMap[a.condition] ?? a.condition}</span>}
            {a.status !== "open" && <span className="qp-lf-status">{STATUS[a.status]}</span>}
            {a.featured && <span className="qp-badge-g4">NỔI BẬT</span>}
            {!a.approved && <span className="qp-lf-status is-pending">⏳ Chờ duyệt</span>}
          </div>
          <h1 id="a-title" className="type-h1" style={{ margin: "var(--space-3) 0 var(--space-2)" }}>{a.title}</h1>
          {lead && <p className="qp-pagehero__lead">{lead}</p>}
          <div className="qp-author">
            <span className="qp-avatar-initials" aria-hidden>{initials(a.postedByName)}</span>
            <div>
              <div className="qp-author__name">{a.postedByName}</div>
              <div className="qp-author__meta">Đăng ngày {formatDate(a.createdAt)} · {a.views} lượt xem</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-wide qp-lf-body">
        {!a.approved && (
          <div className="qp-alert is-warning" role="status" style={{ maxWidth: 820, marginBottom: "var(--space-6)" }}>
            <div className="qp-alert__body"><strong>Tin đang chờ duyệt.</strong> Chỉ bạn và quản trị viên xem được.</div>
          </div>
        )}

        <div className="qp-article-layout is-lf">
          <div className="qp-lf-main">
            <ImageGallery images={a.images ?? []} alt={a.title} />
            <div className="rich-text-editor__content qp-rte-view" dangerouslySetInnerHTML={{ __html: a.description }} />
            {a.location.mapUrl && (
              <div style={{ marginTop: "var(--space-6)" }}>
                <MapEmbed url={a.location.mapUrl} address={a.location.address} />
              </div>
            )}
            <ClassifiedActions slug={a.slug} title={a.title} isOwner={isOwner} status={a.status} />
            <AffiliateCTA />
            <DetailSocial type="mua-ban" slug={slug} title={a.title} />
          </div>

          <aside className="qp-lf-aside">
            <div className="qp-lf-infocard qp-lf-infocard--cta">
              <div className="qp-job-detail__salary"><span>Giá</span><b>{a.priceText}</b></div>
              <div className="qp-lf-infocard__title" style={{ marginTop: 14 }}>Liên hệ người bán</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Người đăng</span><b>{a.contact.name}</b></div>
                <div className="qp-lf-spec__row"><span>Điện thoại</span>{!showPhone ? <b><i style={{ fontWeight: 400 }}>Đã ẩn</i></b> : isOwner ? <b><a href={`tel:${a.contact.phone}`}>{a.contact.phone}</a></b> : <b>{maskPhone(a.contact.phone)}</b>}</div>
                {a.contact.email && showPhone && <div className="qp-lf-spec__row"><span>Email</span><b><a href={`mailto:${a.contact.email}`}>{a.contact.email}</a></b></div>}
              </div>
              {showPhone && !isOwner && a.status === "open" && <a href={`tel:${a.contact.phone}`} className="qp-btn-primary qp-btn-block mt-6">Gọi người bán</a>}
              {isOwner && <p className="type-body-small text-muted" style={{ margin: "12px 0 0" }}>Đây là thông tin hiển thị cho người mua.</p>}
            </div>

            <div className="qp-lf-infocard">
              <div className="qp-lf-infocard__title">Chi tiết</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Danh mục</span><b>{a.categoryLabel}</b></div>
                {a.condition && <div className="qp-lf-spec__row"><span>Tình trạng</span><b>{condMap[a.condition] ?? a.condition}</b></div>}
                <div className="qp-lf-spec__row"><span>Địa điểm</span><b>{wardName}{a.location.address && `, ${a.location.address}`}{unit?.newCommune && <><br /><span className="qp-lf-spec__sub">(Xã mới: {unit.newCommune})</span></>}</b></div>
                <div className="qp-lf-spec__row"><span>Trạng thái</span><b>{STATUS[a.status]}</b></div>
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="qp-lf-related">
            <header className="qp-newsgrid-head"><span className="type-tag qp-sechead__eyebrow">Cùng danh mục</span><h2 className="type-h2">Tin liên quan</h2></header>
            <div className="qp-job-grid">
              {related.map((r) => (
                <article className="qp-job-card" key={r.slug}>
                  <div className="qp-job-card__head">
                    <span className="qp-market-logo is-rao-vat" aria-hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 13.4 12 22l-9-9V3h10l8.6 8.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg></span>
                    <div className="qp-job-card__head-main">
                      <Link href={`/mua-ban/${r.slug}`} className="qp-job-card__title">{r.title}</Link>
                      <div className="qp-job-card__company">💰 {r.priceText}</div>
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
