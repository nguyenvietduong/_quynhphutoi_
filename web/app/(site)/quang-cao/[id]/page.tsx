import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAd, recordImpression, listAllActiveAds, PLACEMENT_LABEL } from "@/lib/ads";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ad = await getPublicAd(id);
  if (!ad) return { title: "Không tìm thấy quảng cáo" };
  return {
    title: `${ad.title} — ${ad.advertiser} | Quảng cáo Quỳnh Phụ`,
    description: (ad.description || ad.title).slice(0, 160),
    robots: { index: false, follow: true }, // trang quảng cáo — không index
  };
}

const fmt = (n: number) => n.toLocaleString("vi-VN");

export default async function AdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = await getPublicAd(id);
  if (!ad) notFound();

  // Đếm lượt xem trang chi tiết (giống incrementViews của bài viết).
  await recordImpression(id).catch(() => {});

  // Một vài quảng cáo khác đang chạy để gợi ý.
  const others = (await listAllActiveAds()).filter((a) => a._id!.toString() !== id).slice(0, 3);

  return (
    <article>
      <section className="qp-pagehero" aria-labelledby="ad-detail-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <Link href="/quang-cao">Quảng cáo</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">{ad.advertiser}</span>
          </nav>
          <div className="qp-lf-detail__badges">
            <span className="qp-ad__label" style={{ position: "static" }}>Tài trợ</span>
            <span className="qp-tag-cat">{PLACEMENT_LABEL[ad.placement]}</span>
          </div>
          <h1 id="ad-detail-title" className="type-h1" style={{ margin: "var(--space-3) 0 var(--space-4)" }}>{ad.title}</h1>
          <p className="qp-pagehero__lead">{ad.advertiser}</p>
        </div>
      </section>

      <div className="container-wide qp-lf-body">
        <div className="qp-article-layout is-lf">
          <div className="qp-lf-main">
            <div className="qp-ad-detail__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.imageDesktop} alt={ad.title} />
            </div>

            {ad.description ? (
              <div className="qp-ad-detail__desc">
                {ad.description.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            ) : (
              <p className="qp-ad-detail__desc text-muted">Nhà tài trợ chưa cung cấp mô tả chi tiết. Vui lòng liên hệ trực tiếp qua thông tin bên cạnh.</p>
            )}
          </div>

          <aside className="qp-lf-aside">
            {/* Liên hệ — CTA chính */}
            <div className="qp-lf-infocard qp-lf-infocard--cta">
              <div className="qp-lf-infocard__title">Liên hệ nhà tài trợ</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Nhãn hàng</span><b>{ad.advertiser}</b></div>
                {ad.phone && (
                  <div className="qp-lf-spec__row"><span>Điện thoại</span><b><a href={`tel:${ad.phone}`}>{ad.phone}</a></b></div>
                )}
              </div>
              {ad.phone && <a href={`tel:${ad.phone}`} className="qp-btn-primary qp-btn-block mt-6">Gọi ngay</a>}
              {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="sponsored nofollow noopener"
                  className={`qp-btn-outline qp-btn-block ${ad.phone ? "mt-4" : "mt-6"}`}>
                  Truy cập website →
                </a>
              )}
              {!ad.phone && !ad.linkUrl && (
                <p className="type-body-small text-muted" style={{ margin: "12px 0 0" }}>Chưa có thông tin liên hệ.</p>
              )}
            </div>

            {/* Thống kê */}
            <div className="qp-lf-infocard">
              <div className="qp-lf-infocard__title">Thống kê</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Lượt xem</span><b>{fmt(ad.impressions)}</b></div>
                <div className="qp-lf-spec__row"><span>Lượt click</span><b>{fmt(ad.clicks)}</b></div>
              </div>
            </div>
          </aside>
        </div>

        {others.length > 0 && (
          <div className="qp-lf-related">
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
