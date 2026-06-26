// Chiếc lá chéo — PORT NGUYÊN BẢN wonmedia-login.html (giữ y hệt hình dạng/màu/
// animation). Chỉ đổi chữ thương hiệu sang Quỳnh Phụ Tôi. SVG thuần (server).

const LEAF =
  "M210 8 C295 55,415 185,420 330 C425 470,355 625,272 705 C248 728,228 742,210 746 C192 742,172 728,148 705 C65 625,-5 470,0 330 C5 185,125 55,210 8 Z";

export function LeafArt() {
  return (
    <>
      {/* ===== LÁ CHÍNH (desktop + mobile top) ===== */}
      <svg className="leaf-layer" viewBox="0 0 940 590" xmlns="http://www.w3.org/2000/svg" overflow="visible">
        <defs>
          <linearGradient id="lbg" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#12381f" />
            <stop offset="30%" stopColor="#2d7a45" />
            <stop offset="65%" stopColor="#3fa85e" />
            <stop offset="100%" stopColor="#60cc7c" />
          </linearGradient>
          <linearGradient id="lhl" x1="0%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#80e89c" stopOpacity=".22" />
            <stop offset="100%" stopColor="#1a4d2e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="42%" stopColor="white" stopOpacity=".2" />
            <stop offset="58%" stopColor="white" stopOpacity=".24" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id="leafShadow" x="-15%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="8" dy="14" stdDeviation="20" floodColor="#0f3020" floodOpacity=".22" />
          </filter>
          <clipPath id="lclip">
            <path d={LEAF} />
          </clipPath>
        </defs>

        <g id="leafGroup" filter="url(#leafShadow)">
          {/* LEAF BODY */}
          <g clipPath="url(#lclip)">
            <rect x="-25" y="0" width="480" height="760" fill="url(#lbg)" />
            <rect x="-25" y="0" width="480" height="760" fill="url(#lhl)" />

            {/* VEINS */}
            <g fill="none" strokeLinecap="round">
              {/* Midrib */}
              <path className="vm d0" d="M210 16 C210 220,210 520,210 742" stroke="rgba(255,255,255,.48)" strokeWidth="2.8" />
              {/* Primary L */}
              <path className="vp d1" d="M210 118 C174 138,132 157,62 182" stroke="rgba(255,255,255,.30)" strokeWidth="1.7" />
              <path className="vp d2" d="M210 188 C168 212,122 234,46 265" stroke="rgba(255,255,255,.28)" strokeWidth="1.6" />
              <path className="vp d3" d="M210 262 C166 288,118 310,38 345" stroke="rgba(255,255,255,.26)" strokeWidth="1.5" />
              <path className="vp d4" d="M210 336 C168 362,126 380,50 412" stroke="rgba(255,255,255,.24)" strokeWidth="1.4" />
              <path className="vp d5" d="M210 405 C176 426,142 443,82 468" stroke="rgba(255,255,255,.22)" strokeWidth="1.3" />
              <path className="vp d6" d="M210 468 C186 482,160 496,116 514" stroke="rgba(255,255,255,.19)" strokeWidth="1.1" />
              <path className="vp d7" d="M210 524 C194 534,174 544,144 555" stroke="rgba(255,255,255,.15)" strokeWidth=".9" />
              {/* Primary R */}
              <path className="vp d1" d="M210 118 C246 138,288 157,358 182" stroke="rgba(255,255,255,.30)" strokeWidth="1.7" />
              <path className="vp d2" d="M210 188 C252 212,298 234,374 265" stroke="rgba(255,255,255,.28)" strokeWidth="1.6" />
              <path className="vp d3" d="M210 262 C254 288,302 310,382 345" stroke="rgba(255,255,255,.26)" strokeWidth="1.5" />
              <path className="vp d4" d="M210 336 C252 362,294 380,370 412" stroke="rgba(255,255,255,.24)" strokeWidth="1.4" />
              <path className="vp d5" d="M210 405 C244 426,278 443,338 468" stroke="rgba(255,255,255,.22)" strokeWidth="1.3" />
              <path className="vp d6" d="M210 468 C234 482,260 496,304 514" stroke="rgba(255,255,255,.19)" strokeWidth="1.1" />
              <path className="vp d7" d="M210 524 C226 534,246 544,276 555" stroke="rgba(255,255,255,.15)" strokeWidth=".9" />
              {/* Secondary L */}
              <path className="vs d8" d="M174 140 C154 152,132 163,104 175" stroke="rgba(255,255,255,.19)" strokeWidth=".85" />
              <path className="vs d8" d="M148 162 C128 175,104 187,74  200" stroke="rgba(255,255,255,.16)" strokeWidth=".75" />
              <path className="vs d9" d="M168 216 C145 231,118 246,84  263" stroke="rgba(255,255,255,.19)" strokeWidth=".85" />
              <path className="vs d9" d="M140 238 C118 254,92  268,58  284" stroke="rgba(255,255,255,.16)" strokeWidth=".75" />
              <path className="vs d10" d="M165 293 C140 310,112 325,72  345" stroke="rgba(255,255,255,.18)" strokeWidth=".8" />
              <path className="vs d10" d="M140 315 C116 333,88  348,52  365" stroke="rgba(255,255,255,.15)" strokeWidth=".7" />
              <path className="vs d11" d="M164 366 C140 384,114 398,78  415" stroke="rgba(255,255,255,.17)" strokeWidth=".78" />
              <path className="vs d11" d="M142 387 C120 404,96  418,64  432" stroke="rgba(255,255,255,.14)" strokeWidth=".68" />
              <path className="vs d12" d="M166 432 C146 448,124 460,94  473" stroke="rgba(255,255,255,.16)" strokeWidth=".72" />
              <path className="vs d12" d="M148 450 C130 464,110 475,84  486" stroke="rgba(255,255,255,.13)" strokeWidth=".62" />
              {/* Secondary R */}
              <path className="vs d8" d="M246 140 C266 152,288 163,316 175" stroke="rgba(255,255,255,.19)" strokeWidth=".85" />
              <path className="vs d8" d="M272 162 C292 175,316 187,346 200" stroke="rgba(255,255,255,.16)" strokeWidth=".75" />
              <path className="vs d9" d="M252 216 C275 231,302 246,336 263" stroke="rgba(255,255,255,.19)" strokeWidth=".85" />
              <path className="vs d9" d="M280 238 C302 254,328 268,362 284" stroke="rgba(255,255,255,.16)" strokeWidth=".75" />
              <path className="vs d10" d="M255 293 C280 310,308 325,348 345" stroke="rgba(255,255,255,.18)" strokeWidth=".8" />
              <path className="vs d10" d="M280 315 C304 333,332 348,368 365" stroke="rgba(255,255,255,.15)" strokeWidth=".7" />
              <path className="vs d11" d="M256 366 C280 384,306 398,342 415" stroke="rgba(255,255,255,.17)" strokeWidth=".78" />
              <path className="vs d11" d="M278 387 C300 404,324 418,356 432" stroke="rgba(255,255,255,.14)" strokeWidth=".68" />
              <path className="vs d12" d="M254 432 C274 448,296 460,326 473" stroke="rgba(255,255,255,.16)" strokeWidth=".72" />
              <path className="vs d12" d="M272 450 C290 464,310 475,336 486" stroke="rgba(255,255,255,.13)" strokeWidth=".62" />
              {/* Tertiary */}
              <path className="vt d13" d="M108 178 C96 187,82 196,66 205" stroke="rgba(255,255,255,.13)" strokeWidth=".55" />
              <path className="vt d13" d="M88  266 C74 277,58 287,42 296" stroke="rgba(255,255,255,.12)" strokeWidth=".5" />
              <path className="vt d14" d="M74  348 C60 360,46 370,30 380" stroke="rgba(255,255,255,.11)" strokeWidth=".5" />
              <path className="vt d14" d="M80  418 C66 430,52 440,36 450" stroke="rgba(255,255,255,.1)" strokeWidth=".45" />
              <path className="vt d13" d="M312 178 C324 187,338 196,354 205" stroke="rgba(255,255,255,.13)" strokeWidth=".55" />
              <path className="vt d13" d="M332 266 C346 277,362 287,378 296" stroke="rgba(255,255,255,.12)" strokeWidth=".5" />
              <path className="vt d14" d="M346 348 C360 360,374 370,390 380" stroke="rgba(255,255,255,.11)" strokeWidth=".5" />
              <path className="vt d14" d="M340 418 C354 430,368 440,384 450" stroke="rgba(255,255,255,.1)" strokeWidth=".45" />
            </g>

            {/* Sheen sweep */}
            <rect id="leafSheen" x="-80" y="0" width="300" height="760" fill="url(#sheen)" />

            {/* Rim highlight */}
            <path d={LEAF} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
          </g>

          {/* Stem */}
          <path d="M210 744 C206 768,204 790,210 806" stroke="#12381f" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity=".55" />
        </g>
      </svg>

      {/* ===== LÁ DƯỚI CÙNG (chỉ hiện trên mobile) ===== */}
      <svg className="leaf-bottom" viewBox="-5 8 430 740" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lbg2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60cc7c" />
            <stop offset="50%" stopColor="#2d7a45" />
            <stop offset="100%" stopColor="#12381f" />
          </linearGradient>
        </defs>
        <g opacity="0.11">
          <path d={LEAF} fill="url(#lbg2)" />
          <g fill="none" strokeLinecap="round">
            <path d="M210 16 C210 220,210 520,210 742" stroke="rgba(255,255,255,.55)" strokeWidth="2.5" />
            <path d="M210 118 C174 138,132 157,62 182" stroke="rgba(255,255,255,.35)" strokeWidth="1.4" />
            <path d="M210 118 C246 138,288 157,358 182" stroke="rgba(255,255,255,.35)" strokeWidth="1.4" />
            <path d="M210 262 C166 288,118 310,38 345" stroke="rgba(255,255,255,.28)" strokeWidth="1.2" />
            <path d="M210 262 C254 288,302 310,382 345" stroke="rgba(255,255,255,.28)" strokeWidth="1.2" />
            <path d="M210 405 C176 426,142 443,82 468" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
            <path d="M210 405 C244 426,278 443,338 468" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
          </g>
        </g>
      </svg>
    </>
  );
}
