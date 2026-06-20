import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAd, recordImpression, listAllActiveAds } from "@/lib/ads";
import { MapEmbed } from "@/components/common/MapEmbed";
import { ImageGallery } from "@/components/common/ImageGallery";
import { stripHtml } from "@/lib/strip-html";
import { cldHtml } from "@/lib/cloudinary-url";
import { buildMetadata, jsonLdAd, jsonLdBreadcrumb } from "@/lib/seo";
import { applySeo } from "@/lib/seo-fields";
import { JsonLd } from "@/components/common/JsonLd";
import { AffiliateCTA } from "@/components/common/AffiliateCTA";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ad = await getPublicAd(id);
  if (!ad) return { title: "Không tìm thấy quảng cáo" };
  return buildMetadata({
    // SEO override của admin (nếu có) thắng meta tự sinh; vẫn luôn noindex (trang tài trợ).
    ...applySeo(
      {
        title: `${ad.title} — ${ad.advertiser}`,
        description: (stripHtml(ad.description || "") || ad.title).slice(0, 160),
        image: ad.images?.[0] || ad.imageDesktop,
      },
      ad.seo ?? undefined,
    ),
    path: `/quang-cao/${id}`,
    noindex: true,
  });
}

const ICON = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, width: 18, height: 18 };
function PhoneIcon() { return (<svg {...ICON} aria-hidden><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" /></svg>); }
function PinIcon() { return (<svg {...ICON} aria-hidden><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>); }

export default async function AdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = await getPublicAd(id);
  if (!ad) notFound();

  // Đếm lượt xem trang chi tiết (giống incrementViews của bài viết).
  await recordImpression(id).catch(() => {});

  const others = (await listAllActiveAds()).filter((a) => a._id!.toString() !== id).slice(0, 3);
  const hasDesc = !!stripHtml(ad.description || "");
  const brandInitial = (ad.advertiser.trim()[0] || "?").toUpperCase();

  return (
    <article className="qp-addetail">
      <JsonLd data={[
        jsonLdAd(ad, stripHtml(ad.description || "") || ad.title),
        jsonLdBreadcrumb([
          { name: "Trang chủ", path: "/" },
          { name: "Quảng cáo", path: "/quang-cao" },
          { name: ad.advertiser, path: `/quang-cao/${id}` },
        ]),
      ]} />
      <div className="container-wide">
        <nav className="qp-breadcrumb qp-addetail__crumbs" aria-label="Breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span className="qp-breadcrumb__sep">›</span>
          <Link href="/quang-cao">Quảng cáo</Link>
          <span className="qp-breadcrumb__sep">›</span>
          <span className="qp-breadcrumb__current">{ad.advertiser}</span>
        </nav>

        {/* Đầu trang kiểu "sản phẩm": ảnh trái · thông tin + CTA phải */}
        <div className="qp-addetail__head">
          <div className="qp-addetail__media">
            <ImageGallery images={ad.images?.length ? ad.images : [ad.imageDesktop]} alt={ad.title} />
          </div>

          <aside className="qp-addetail__panel">
            <span className="qp-ad-sponsor-badge">★ Nội dung tài trợ</span>
            <h1 className="qp-addetail__title">{ad.title}</h1>
            <div className="qp-addetail__brand">
              <span className="qp-addetail__brand-ic" aria-hidden>{brandInitial}</span>
              <span>{ad.advertiser}</span>
            </div>

            {(ad.phone || ad.address) && (
              <div className="qp-addetail__contact">
                {ad.phone && (
                  <a className="qp-addetail__row" href={`tel:${ad.phone}`}>
                    <PhoneIcon /><span>{ad.phone}</span>
                  </a>
                )}
                {ad.address && (
                  <div className="qp-addetail__row is-static">
                    <PinIcon /><span>{ad.address}</span>
                  </div>
                )}
              </div>
            )}

            <div className="qp-addetail__cta">
              {ad.phone && <a href={`tel:${ad.phone}`} className="qp-btn-primary qp-btn-block">Gọi ngay</a>}
              {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="sponsored nofollow noopener" className="qp-btn-outline qp-btn-block">
                  Truy cập website →
                </a>
              )}
              {!ad.phone && !ad.linkUrl && (
                <p className="type-body-small text-muted">Liên hệ trực tiếp với nhà tài trợ.</p>
              )}
            </div>
          </aside>
        </div>

        {/* Nội dung: mô tả bên TRÁI · bản đồ bên PHẢI (giống bố cục đầu trang) */}
        {(hasDesc || ad.mapUrl) && (
          <div className={`qp-addetail__body${hasDesc && ad.mapUrl ? "" : " is-single"}`}>
            {hasDesc && (
              <section className="qp-addetail__content">
                <h2 className="qp-addetail__h2">Giới thiệu</h2>
                <div className="rich-text-editor__content qp-rte-view" dangerouslySetInnerHTML={{ __html: cldHtml(ad.description!) }} />
              </section>
            )}
            {ad.mapUrl && (
              <aside className="qp-addetail__map">
                <MapEmbed url={ad.mapUrl} address={ad.address} />
              </aside>
            )}
          </div>
        )}

        <AffiliateCTA />

        {/* Quảng cáo khác */}
        {others.length > 0 && (
          <div className="qp-addetail__related">
            <header className="qp-newsgrid-head">
              <span className="type-tag qp-sechead__eyebrow">Nhà tài trợ khác</span>
              <h2 className="type-h2">Quảng cáo khác</h2>
            </header>
            <div className="grid grid-3">
              {others.map((o) => (
                <Link key={o._id!.toString()} href={`/quang-cao/${o._id!.toString()}`} className="qp-newscard qp-ad-native">
                  <span className="qp-newscard__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.imageDesktop} alt={o.title} loading="lazy" />
                    <span className="qp-ad__label">Tài trợ</span>
                  </span>
                  <div className="qp-newscard__body">
                    <h3 className="qp-newscard__title">{o.title}</h3>
                    <div className="qp-newscard__meta"><span>{o.advertiser}</span></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
