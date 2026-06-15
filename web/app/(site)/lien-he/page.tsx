import { pageMetadata } from "@/lib/page-seo";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return pageMetadata({
    key: "/lien-he", path: "/lien-he",
    title: "Liên hệ & đặt quảng cáo",
    description: "Liên hệ với Cổng thông tin Quỳnh Phụ — góp ý, hợp tác và đặt quảng cáo.",
  });
}

const EMAIL = "duongnv10504@gmail.com";

function Icon({ name }: { name: string }) {
  const p = {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const, width: 20, height: 20,
  };
  switch (name) {
    case "mail": return (<svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>);
    case "megaphone": return (<svg {...p}><path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1z" /><path d="M18 9a3 3 0 0 1 0 6" /></svg>);
    case "map-pin": return (<svg {...p}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>);
    case "clock": return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
    default: return null;
  }
}

export default function LienHePage() {
  return (
    <>
      <section className="qp-pagehero" aria-labelledby="lh-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Liên hệ</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Liên hệ · Quảng cáo</span>
          <h1 id="lh-title" className="type-h1">Liên hệ &amp; đặt quảng cáo</h1>
          <p className="qp-pagehero__lead">
            Góp ý nội dung, hợp tác hay đặt quảng cáo trên Cổng thông tin Quỳnh Phụ — gửi liên hệ, mình phản hồi sớm nhất.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <div className="qp-contact">
            <ContactForm />

            <div className="qp-contact__side">
              {/* Liên hệ trực tiếp */}
              <div className="qp-panel">
                <h2 className="type-h3 qp-panel__title">Liên hệ trực tiếp</h2>
                <p className="type-body-small qp-panel__sub">Nhanh nhất qua email — phản hồi trong vòng 24 giờ.</p>
                <div>
                  <a href={`mailto:${EMAIL}?subject=Đặt quảng cáo - Quỳnh Phụ Tôi`} className="qp-contactrow">
                    <span className="qp-contactrow__icon"><Icon name="mail" /></span>
                    <span className="qp-contactrow__text">
                      <span className="qp-contactrow__label">Email</span>
                      <span className="qp-contactrow__value">{EMAIL}</span>
                    </span>
                  </a>
                  <div className="qp-contactrow">
                    <span className="qp-contactrow__icon"><Icon name="megaphone" /></span>
                    <span className="qp-contactrow__text">
                      <span className="qp-contactrow__label">Quảng cáo</span>
                      <span className="qp-contactrow__value">Nhận đặt quảng cáo &amp; hợp tác</span>
                    </span>
                  </div>
                  <div className="qp-contactrow">
                    <span className="qp-contactrow__icon"><Icon name="map-pin" /></span>
                    <span className="qp-contactrow__text">
                      <span className="qp-contactrow__label">Khu vực</span>
                      <span className="qp-contactrow__value">Xã Quỳnh Phụ · Thái Bình</span>
                    </span>
                  </div>
                  <div className="qp-contactrow">
                    <span className="qp-contactrow__icon"><Icon name="clock" /></span>
                    <span className="qp-contactrow__text">
                      <span className="qp-contactrow__label">Phản hồi</span>
                      <span className="qp-contactrow__value">Trong vòng 24 giờ</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Quảng cáo tại đây */}
              <div className="qp-adcard">
                <h3 className="type-h3">Quảng cáo tại Quỳnh Phụ Tôi</h3>
                <p>Tiếp cận người dân Quỳnh Phụ ngay trên trang tin địa phương — phù hợp cho cửa hàng, dịch vụ, tuyển dụng và sự kiện trong huyện.</p>
                <div className="qp-adcard__stats">
                  <div className="qp-adcard__stat"><b>10K+</b><span>Lượt xem / tháng</span></div>
                  <div className="qp-adcard__stat"><b>10</b><span>Chuyên mục</span></div>
                  <div className="qp-adcard__stat"><b>37</b><span>Xã phủ sóng</span></div>
                </div>
                <a href={`mailto:${EMAIL}?subject=Đặt quảng cáo - Quỳnh Phụ Tôi`} className="qp-btn-secondary on-dark">
                  Gửi email đặt quảng cáo <span className="qp-arrow">→</span>
                </a>
              </div>

              <div className="qp-alert is-info">
                <svg className="qp-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
                </svg>
                <div className="qp-alert__body">Số liệu mang tính minh hoạ. Đây là trang cộng đồng, không phải trang chính thức của cơ quan nhà nước.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
