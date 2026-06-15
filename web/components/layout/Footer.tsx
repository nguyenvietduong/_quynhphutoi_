import Link from "next/link";
import Image from "next/image";
import { NAV, BRAND } from "@/lib/nav";
import { getSettings } from "@/lib/settings";

function FIcon({ name }: { name: string }) {
  const p = {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const, width: 18, height: 18,
  };
  switch (name) {
    case "map-pin": return (<svg {...p}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>);
    case "mail": return (<svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>);
    case "megaphone": return (<svg {...p}><path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1z" /><path d="M18 9a3 3 0 0 1 0 6" /></svg>);
    case "facebook": return (<svg {...p}><path d="M14 9h3V6h-3a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9z" /></svg>);
    case "youtube": return (<svg {...p}><rect x="3" y="6" width="18" height="12" rx="3" /><path d="m11 9 4 3-4 3V9z" /></svg>);
    case "chat": return (<svg {...p}><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /></svg>);
    default: return null;
  }
}

export async function Footer() {
  const year = new Date().getFullYear();
  const s = await getSettings();
  const colInfo = NAV.slice(0, 5); // Trang chủ, Tổng quan, Trường học, Y tế, Việc làm
  const colUtil = NAV.slice(5);    // Tìm đồ rơi, Chợ, Giao thông, Di tích, Tin tức, Liên hệ

  return (
    <footer className="qp-footer">
      <span className="qp-footer__rice" aria-hidden />

      <div className="container-wide qp-footer__inner">
        {/* Dải kêu gọi hợp tác / quảng cáo */}
        <div className="qp-footer__cta">
          <div className="qp-footer__cta-text">
            <span className="qp-footer__cta-eyebrow"><FIcon name="megaphone" /> Hợp tác · Quảng cáo</span>
            <h3 className="qp-footer__cta-title">Doanh nghiệp địa phương muốn tiếp cận người dân Quỳnh Phụ?</h3>
            <p className="qp-footer__cta-sub">Đặt banner, tài trợ hoặc hợp tác nội dung cùng cổng thông tin cộng đồng.</p>
          </div>
          <a href={`mailto:${s.contactEmail}`} className="qp-footer__cta-btn">Liên hệ ngay <span aria-hidden>→</span></a>
        </div>

        <div className="qp-footer__top">
          <div className="qp-footer__brand">
            <div className="qp-brand">
              <span className="qp-brand__mark">
                <Image src={BRAND.logo} alt="" fill sizes="48px" />
              </span>
              <span className="qp-brand__text">
                <span className="qp-brand__name">{BRAND.name}</span>
                <span className="qp-brand__sub">{BRAND.sub}</span>
              </span>
            </div>
            <p className="qp-footer__desc">
              Một người yêu Thái Bình lập trang này để mọi người dễ nắm thông tin xã Quỳnh Phụ.
              Đây là trang <b>cộng đồng</b>, không phải trang chính thức của nhà nước.
            </p>
            <div className="qp-footer__social">
              {s.socialFacebook && <a href={s.socialFacebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FIcon name="facebook" /></a>}
              {s.socialYoutube && <a href={s.socialYoutube} target="_blank" rel="noreferrer" aria-label="YouTube"><FIcon name="youtube" /></a>}
              {s.socialZalo && <a href={s.socialZalo} target="_blank" rel="noreferrer" aria-label="Zalo"><FIcon name="chat" /></a>}
            </div>
          </div>

          <nav className="qp-footer__col" aria-label="Thông tin">
            <h4>Thông tin</h4>
            {colInfo.map((item) => (
              <Link href={item.href} key={item.id}>{item.label}</Link>
            ))}
          </nav>

          <nav className="qp-footer__col" aria-label="Tiện ích">
            <h4>Tiện ích</h4>
            {colUtil.map((item) => (
              <Link href={item.href} key={item.id}>{item.label}</Link>
            ))}
            <Link href="/quang-cao">Quảng cáo</Link>
          </nav>

          <div className="qp-footer__col qp-footer__contact">
            <h4>Liên hệ</h4>
            <a className="qp-footer__email" href={`mailto:${s.contactEmail}`}><FIcon name="mail" />{s.contactEmail}</a>
            {s.contactHotline && <a href={`tel:${s.contactHotline.replace(/\s/g, "")}`}><FIcon name="chat" />{s.contactHotline}</a>}
            <span><FIcon name="map-pin" />{s.contactLocation}</span>
            {s.contactNote && <span className="qp-footer__note"><FIcon name="megaphone" />{s.contactNote}</span>}
          </div>
        </div>

        <div className="qp-footer__bottom">
          <span>© {year} · Cổng thông tin cộng đồng Quỳnh Phụ — phi chính thức.</span>
          <span className="qp-footer__madein">Làm bởi một người yêu Thái Bình <span className="qp-footer__heart" aria-hidden>♥</span></span>
        </div>

        {/* Ghi chú bắt buộc khi ẩn huy hiệu reCAPTCHA (theo điều khoản Google) */}
        <p className="qp-footer__recaptcha">
          Trang này được bảo vệ bởi reCAPTCHA — áp dụng{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Chính sách bảo mật</a> và{" "}
          <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Điều khoản dịch vụ</a> của Google.
        </p>
      </div>
    </footer>
  );
}
