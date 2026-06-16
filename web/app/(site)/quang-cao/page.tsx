import Link from "next/link";
import { listAllActiveAds, PLACEMENT_LABEL } from "@/lib/ads";
import { pageMetadata } from "@/lib/page-seo";
import { cldUrl } from "@/lib/cloudinary-url";

export async function generateMetadata() {
  return pageMetadata({
    key: "/quang-cao", path: "/quang-cao",
    title: "Quảng cáo — Nhà tài trợ Quỳnh Phụ",
    description: "Danh sách nhà tài trợ và quảng cáo của doanh nghiệp, cửa hàng trên địa bàn xã Quỳnh Phụ.",
    noindex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function QuangCaoPage() {
  const ads = await listAllActiveAds();

  return (
    <>
      <section className="qp-pagehero" aria-labelledby="ad-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Quảng cáo</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Nhà tài trợ</span>
          <h1 id="ad-title" className="type-h1">Quảng cáo & Nhà tài trợ</h1>
          <p className="qp-pagehero__lead">
            Các doanh nghiệp, cửa hàng đang đồng hành cùng Cổng thông tin Quỳnh Phụ. Bấm vào mỗi
            quảng cáo để xem chi tiết và thông tin liên hệ.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          {ads.length === 0 ? (
            <div className="qp-empty">
              <div className="qp-empty__title">Chưa có quảng cáo nào</div>
              <p className="type-body-small">Hiện chưa có nhà tài trợ đang chạy quảng cáo.</p>
            </div>
          ) : (
            <div className="grid grid-3">
              {ads.map((a) => (
                <Link key={a._id!.toString()} href={`/quang-cao/${a._id!.toString()}`} className="qp-newscard qp-ad-native">
                  <span className="qp-newscard__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cldUrl(a.imageDesktop, { w: 600 })} alt={a.title} loading="lazy" />
                    <span className="qp-ad__label">Tài trợ</span>
                  </span>
                  <div className="qp-newscard__body">
                    <span className="qp-tag-cat">{PLACEMENT_LABEL[a.placement]}</span>
                    <h3 className="qp-newscard__title">{a.title}</h3>
                    <div className="qp-newscard__meta"><span>{a.advertiser}</span></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
