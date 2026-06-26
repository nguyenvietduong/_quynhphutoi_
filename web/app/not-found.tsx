import Link from "next/link";
import Image from "next/image";
import { BRAND } from "@/lib/nav";
import { getSettings } from "@/lib/settings";
import "@/styles/notfound.css";

const LEAF =
  "M210 8 C295 55,415 185,420 330 C425 470,355 625,272 705 C248 728,228 742,210 746 C192 742,172 728,148 705 C65 625,-5 470,0 330 C5 185,125 55,210 8 Z";

export default async function NotFound() {
  const s = await getSettings();
  const logo = s.siteLogo || BRAND.logo;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <main className="wm-404">
        <div className="nf-card">

          {/* ── LÁ TRANG TRÍ MOBILE (top-right) ── */}
          <svg className="nf-leaf-mobile" viewBox="0 0 420 760" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="nfMlg" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#12381f" />
                <stop offset="50%" stopColor="#2d7a45" />
                <stop offset="100%" stopColor="#60cc7c" />
              </linearGradient>
            </defs>
            <path d={LEAF} fill="url(#nfMlg)" />
            <path d="M210 16 C210 220,210 520,210 742" stroke="rgba(255,255,255,.4)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </svg>

          {/* ── CONTENT PANEL (trái) ── */}
          <div className="nf-content">
            <Link className="nf-brand" href="/" aria-label="Quỳnh Phụ Tôi — Về trang chủ">
              <div className="nf-brand-icon">
                <Image src={logo} alt="" fill sizes="30px" />
              </div>
              <span className="nf-brand-name">Quỳnh Phụ Tôi</span>
            </Link>

            <div className="nf-num">404</div>
            <div className="nf-bar" />
            <div className="nf-title">Trang không tồn tại</div>
            <p className="nf-sub">
              Trang bạn đang tìm kiếm có thể đã bị xoá, đổi địa chỉ,
              hoặc tạm thời không khả dụng.
            </p>

            <Link href="/" className="nf-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Về trang chủ
            </Link>

            <p className="nf-links">
              Hoặc thử&nbsp;
              <Link href="/tin-tuc">xem tin tức</Link>
              &nbsp;·&nbsp;
              <Link href="/search">tìm kiếm</Link>
            </p>
          </div>

          {/* ── LEAF PANEL (phải, desktop) ── */}
          <div className="nf-leaf-panel">
            <svg
              className="nf-leaf-svg"
              viewBox="0 0 420 760"
              xmlns="http://www.w3.org/2000/svg"
              overflow="visible"
            >
              <defs>
                <linearGradient id="nfLg" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0d2e1a" />
                  <stop offset="30%" stopColor="#1e5c35" />
                  <stop offset="65%" stopColor="#3fa85e" />
                  <stop offset="100%" stopColor="#80e89c" />
                </linearGradient>
                <linearGradient id="nfHl" x1="0%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#80e89c" stopOpacity=".28" />
                  <stop offset="100%" stopColor="#1a4d2e" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="nfSh" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="white" stopOpacity="0" />
                  <stop offset="42%" stopColor="white" stopOpacity=".18" />
                  <stop offset="58%" stopColor="white" stopOpacity=".22" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <filter id="nfDrop" x="-15%" y="-10%" width="140%" height="130%">
                  <feDropShadow dx="6" dy="12" stdDeviation="16" floodColor="#0a1e10" floodOpacity=".4" />
                </filter>
                <clipPath id="nfClip">
                  <path d={LEAF} />
                </clipPath>
              </defs>

              <g id="nfLeafGroup" filter="url(#nfDrop)">
                <g clipPath="url(#nfClip)">
                  <rect x="-25" y="0" width="480" height="760" fill="url(#nfLg)" />
                  <rect x="-25" y="0" width="480" height="760" fill="url(#nfHl)" />

                  <g fill="none" strokeLinecap="round">
                    {/* gân chính */}
                    <path className="nf-vm nfd0" d="M210 16 C210 220,210 520,210 742" stroke="rgba(255,255,255,.38)" strokeWidth="2.5" />
                    {/* gân trái */}
                    <path className="nf-vp nfd1" d="M210 118 C174 138,132 157,62 182" stroke="rgba(255,255,255,.26)" strokeWidth="1.5" />
                    <path className="nf-vp nfd2" d="M210 188 C168 212,122 234,46 265" stroke="rgba(255,255,255,.24)" strokeWidth="1.4" />
                    <path className="nf-vp nfd3" d="M210 262 C166 288,118 310,38 345" stroke="rgba(255,255,255,.22)" strokeWidth="1.3" />
                    <path className="nf-vp nfd4" d="M210 336 C168 362,126 380,50 412" stroke="rgba(255,255,255,.20)" strokeWidth="1.2" />
                    <path className="nf-vp nfd5" d="M210 405 C176 426,142 443,82 468" stroke="rgba(255,255,255,.18)" strokeWidth="1.1" />
                    <path className="nf-vp nfd6" d="M210 468 C186 482,160 496,116 514" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
                    <path className="nf-vp nfd7" d="M210 524 C194 534,174 544,144 555" stroke="rgba(255,255,255,.12)" strokeWidth=".85" />
                    {/* gân phải */}
                    <path className="nf-vp nfd1" d="M210 118 C246 138,288 157,358 182" stroke="rgba(255,255,255,.26)" strokeWidth="1.5" />
                    <path className="nf-vp nfd2" d="M210 188 C252 212,298 234,374 265" stroke="rgba(255,255,255,.24)" strokeWidth="1.4" />
                    <path className="nf-vp nfd3" d="M210 262 C254 288,302 310,382 345" stroke="rgba(255,255,255,.22)" strokeWidth="1.3" />
                    <path className="nf-vp nfd4" d="M210 336 C252 362,294 380,370 412" stroke="rgba(255,255,255,.20)" strokeWidth="1.2" />
                    <path className="nf-vp nfd5" d="M210 405 C244 426,278 443,338 468" stroke="rgba(255,255,255,.18)" strokeWidth="1.1" />
                    <path className="nf-vp nfd6" d="M210 468 C234 482,260 496,304 514" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
                    <path className="nf-vp nfd7" d="M210 524 C226 534,246 544,276 555" stroke="rgba(255,255,255,.12)" strokeWidth=".85" />
                  </g>

                  <rect id="nfLeafSheen" x="-80" y="0" width="270" height="760" fill="url(#nfSh)" />
                  <path d={LEAF} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
                </g>
                <path d="M210 744 C206 768,204 790,210 806" stroke="#0d2e1a" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".5" />
              </g>
            </svg>

            <div className="nf-watermark">
              <span>Quỳnh Phụ Tôi</span>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
