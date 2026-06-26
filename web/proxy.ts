// Chống "load lại trang liên tục" (anti-flood) — đếm số lượt tải TRANG theo IP và theo
// user (nếu đăng nhập). Vượt ngưỡng → chặn tạm + trả trang báo spam (HTTP 429).
//
// Next 16: dùng convention "proxy" (thay cho "middleware" đã deprecated).
// LƯU Ý: bộ đếm cửa sổ trượt nằm trong RAM (Map module-global) → chỉ CHÍNH XÁC khi
// self-host 1 tiến trình (Docker/VPS, `next start`). Trên serverless/CDN nhiều instance
// biến global không chia sẻ → cần chuyển store sang Redis/Upstash.
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Có thể chỉnh qua biến môi trường.
const MAX = Number(process.env.RELOAD_MAX || "10");          // tối đa số lượt tải trang
const WINDOW_MS = Number(process.env.RELOAD_WINDOW_SEC || "10") * 1000; // trong cửa sổ (giây)
const BASE_BLOCK_MS = Number(process.env.RELOAD_BLOCK_SEC || "60") * 1000;       // chặn lần đầu (giây)
const MAX_BLOCK_MS = Number(process.env.RELOAD_BLOCK_MAX_SEC || "3600") * 1000;  // trần chặn (giây)
const OFFENSE_RESET_MS = Number(process.env.RELOAD_OFFENSE_RESET_SEC || "3600") * 1000; // ngoan đủ lâu → quên vi phạm

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

const hits = new Map<string, number[]>();              // key → mốc thời gian các lượt gần đây
const blocked = new Map<string, number>();             // key → bị chặn tới thời điểm
const offenses = new Map<string, { n: number; last: number }>(); // key → số lần bị chặn liên tiếp

function ipOf(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : (req.headers.get("x-real-ip") || "unknown");
}

// Request do Next.js/trình duyệt TỰ bắn (prefetch link + điều hướng mềm RSC), KHÔNG phải
// người dùng tải lại trang. Một lần mở trang danh sách (chợ, việc làm…) sinh ra hàng chục
// prefetch như vậy — nếu đếm chúng sẽ chặn oan. Chỉ đếm lượt tải tài liệu HTML thật.
function isPrefetchOrRsc(req: NextRequest): boolean {
  // QUAN TRỌNG (Next.js 16): tới tầng proxy thì các header nội bộ `RSC`,
  // `Next-Router-Prefetch` và query `_rsc` ĐÃ BỊ Next STRIP → đọc ra null/false,
  // KHÔNG dùng để nhận diện được. Tín hiệu còn sót lại mà proxy vẫn thấy:
  //   • RSC payload (điều hướng mềm)  → Accept: text/x-component
  //   • Prefetch (<Link> + suy đoán)  → Sec-Purpose chứa "prefetch"
  // Tài liệu HTML thật (mở trang / F5) → Accept: text/html, Sec-Fetch-Mode: navigate
  // ⇒ chỉ những lượt tải tài liệu thật mới bị tính vào bộ đếm chống-flood.
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/x-component")) return true;     // RSC payload (điều hướng mềm)
  const purpose = req.headers.get("sec-purpose") || req.headers.get("purpose") || "";
  if (purpose.includes("prefetch")) return true;            // prefetch (<Link> + suy đoán trình duyệt)

  // Fallback phòng xa — môi trường/đời Next khác có thể vẫn để lọt header/query gốc.
  if (req.headers.get("next-router-prefetch")) return true;
  if (req.headers.get("rsc")) return true;
  if (req.nextUrl.searchParams.has("_rsc")) return true;
  return false;
}

async function userId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("qp_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return String(payload.sub ?? "") || null;
  } catch {
    return null;
  }
}

// Thời gian chặn TĂNG THEO CẤP SỐ NHÂN theo số lần tái phạm: 1 → 2 → 4 → 8 … phút (trần MAX).
// Ngoan quá OFFENSE_RESET_MS không vi phạm → quên, lại tính từ lần đầu.
function nextBlockMs(key: string, now: number): number {
  const o = offenses.get(key);
  const n = o && now - o.last < OFFENSE_RESET_MS ? o.n + 1 : 1;
  offenses.set(key, { n, last: now });
  return Math.min(BASE_BLOCK_MS * 2 ** (n - 1), MAX_BLOCK_MS);
}

// Ghi 1 lượt cho key; trả về số giây còn bị chặn (>0 nếu đang/ vừa bị chặn).
function tick(key: string, now: number): number {
  const until = blocked.get(key);
  if (until) {
    if (until > now) return Math.ceil((until - now) / 1000);
    blocked.delete(key);
  }
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  if (arr.length > MAX) {
    const ms = nextBlockMs(key, now);
    blocked.set(key, now + ms);
    hits.delete(key);
    return Math.ceil(ms / 1000);
  }
  return 0;
}

export async function proxy(req: NextRequest) {
  // Không tính prefetch/RSC vào bộ đếm chống-flood (xem isPrefetchOrRsc).
  if (isPrefetchOrRsc(req)) return NextResponse.next();

  const now = Date.now();
  const uid = await userId(req);
  // Đếm theo IP và theo user (nếu có) — vượt ở key nào cũng chặn.
  let wait = tick(`ip:${ipOf(req)}`, now);
  if (uid) wait = Math.max(wait, tick(`u:${uid}`, now));

  if (wait > 0) {
    return new NextResponse(blockHtml(wait), {
      status: 429,
      headers: { "content-type": "text/html; charset=utf-8", "retry-after": String(wait) },
    });
  }
  return NextResponse.next();
}

// Chỉ áp cho điều hướng trang công khai — bỏ qua API, tài nguyên tĩnh, ảnh, và khu admin.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|img|admin).*)"],
};

function blockHtml(sec: number): string {
  const clock = sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : String(sec);
  const human = sec >= 60
    ? `${Math.floor(sec / 60)} phút${sec % 60 ? " " + (sec % 60) + " giây" : ""}`
    : `${sec} giây`;

  const LEAF = "M210 8 C295 55,415 185,420 330 C425 470,355 625,272 705 C248 728,228 742,210 746 C192 742,172 728,148 705 C65 625,-5 470,0 330 C5 185,125 55,210 8 Z";

  return `<!doctype html><html lang="vi"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="${sec}; url=/" />
<title>Bảo vệ hệ thống — Trang cộng đồng Quỳnh Phụ</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
<style>
:root{--g1:#1a4d2e;--g2:#2d7a45;--g3:#3fa85e;--wm-white:#fff}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;
     background:radial-gradient(ellipse at 30% 50%,#d8f0e2 0%,#edf7f1 60%);
     min-height:100vh;min-height:100dvh;
     display:flex;align-items:center;justify-content:center;overflow:hidden}
.card{position:relative;width:940px;height:590px;background:var(--wm-white);
      border-radius:30px;box-shadow:0 40px 100px rgba(30,80,50,.15),0 8px 24px rgba(0,0,0,.06);
      overflow:hidden;display:flex;animation:cardIn .9s cubic-bezier(.22,1,.36,1) both}
@keyframes cardIn{from{opacity:0;transform:translateY(22px) scale(.97)}to{opacity:1;transform:none}}
.leaf-layer{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:visible}
#leafGroup{transform-origin:155px 72px;transform:rotate(-32deg) translate(-55px,-38px);
           animation:wmWind 8s ease-in-out infinite}
@keyframes wmWind{
  0%,100%{transform:rotate(-32deg) translate(-55px,-38px)}
  20%{transform:rotate(-30.4deg) translate(-52px,-35px) skewX(.5deg)}
  45%{transform:rotate(-33.4deg) translate(-57px,-41px) skewX(-.45deg)}
  62%{transform:rotate(-31deg) translate(-53px,-36px) skewX(.3deg)}
  80%{transform:rotate(-32.8deg) translate(-56px,-40px) skewX(-.2deg)}}
#leafSheen{animation:sheenMove 5.5s ease-in-out infinite}
@keyframes sheenMove{
  0%,100%{opacity:0;transform:translateX(-140px)}
  28%{opacity:1;transform:translateX(20px)}
  55%{opacity:.5;transform:translateX(160px)}
  75%{opacity:0;transform:translateX(280px)}}
.vm{stroke-dasharray:650;stroke-dashoffset:650;animation:dv 2s ease forwards}
.vp{stroke-dasharray:220;stroke-dashoffset:220;animation:dv 1.3s ease forwards}
@keyframes dv{to{stroke-dashoffset:0}}
.d0{animation-delay:.3s}.d1{animation-delay:.5s}.d2{animation-delay:.65s}
.d3{animation-delay:.75s}.d4{animation-delay:.85s}.d5{animation-delay:.95s}
.d6{animation-delay:1.05s}.d7{animation-delay:1.12s}
.brand-corner{position:absolute;top:28px;right:38px;display:flex;align-items:center;
              gap:8px;z-index:20;text-decoration:none;transition:opacity .2s}
.brand-corner:hover{opacity:.8}
.brand-icon{width:30px;height:30px;border-radius:8px;overflow:hidden;flex-shrink:0;
            background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center}
.brand-icon img{width:100%;height:100%;object-fit:contain}
.brand-corner-name{font-family:'Cormorant Garamond',serif;font-size:1.05rem;font-weight:700;
                   color:rgba(255,255,255,.92);letter-spacing:.02em}
.form-panel{position:relative;z-index:10;width:400px;min-height:590px;
            padding:60px 36px 50px 48px;
            display:flex;flex-direction:column;justify-content:center}
.title-row{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.title-icon{width:36px;height:36px;border-radius:10px;flex-shrink:0;
            background:linear-gradient(135deg,#e8f7ee,#d0f0de);
            display:flex;align-items:center;justify-content:center}
.title-icon svg{width:18px;height:18px;color:var(--g2)}
.form-title{font-family:'Cormorant Garamond',serif;font-size:1.95rem;font-weight:700;
            color:var(--g1);line-height:1.1}
.form-sub{font-size:.8rem;color:#7a9e87;margin-bottom:22px;font-weight:300;line-height:1.55}
.ring{position:relative;width:112px;height:112px;margin-bottom:20px}
.ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;
          color:var(--g1);font-variant-numeric:tabular-nums}
.desc{font-size:.8rem;color:#7a9e87;line-height:1.65;margin-bottom:20px;font-weight:300}
.desc b{color:var(--g1);font-weight:600}
.actions{display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-block;padding:11px 22px;border-radius:10px;text-decoration:none;
     font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:500;
     transition:transform .15s,box-shadow .2s;position:relative;overflow:hidden}
.btn-primary{background:linear-gradient(135deg,var(--g1) 0%,var(--g3) 100%);color:#fff;
             box-shadow:0 6px 22px rgba(30,80,50,.28)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(30,80,50,.36)}
.btn-primary::after{content:'';position:absolute;inset:0;
                    background:linear-gradient(135deg,rgba(255,255,255,.18) 0%,transparent 60%);
                    pointer-events:none}
.btn-ghost{border:1.5px solid rgba(45,122,69,.35);color:var(--g1);background:transparent}
.btn-ghost:hover{border-color:var(--g3)}
.note{font-size:.72rem;color:#a0bba8;margin-top:16px;line-height:1.5}
.leaf-bottom{display:none}
@media(prefers-reduced-motion:reduce){
  .card,#leafGroup,#leafSheen{animation:none}
  #leafGroup{transform:rotate(-32deg) translate(-55px,-38px)}
  .vm,.vp{animation:none;stroke-dashoffset:0}}
@media(max-width:768px){
  body{padding:0;align-items:stretch}
  .card{width:100%;height:100dvh;height:100vh;flex-direction:column;border-radius:0;
        box-shadow:none;background:radial-gradient(ellipse at 70% 40%,#a8d8bc 0%,#ceeedd 100%);
        overflow:hidden}
  .leaf-layer{position:absolute;top:-20px;right:-60px;bottom:auto;left:auto;
              width:62vw;height:auto;opacity:.45;transform:scaleX(-1)}
  .brand-corner{position:absolute;top:calc(env(safe-area-inset-top,0px) + 20px);
                left:22px;right:auto}
  .brand-corner-name{color:var(--g1)}
  .brand-icon{background:var(--g2)}
  .form-panel{margin-top:190px;flex:1;width:100%;min-height:0;padding:28px 26px 32px;
              background:#fff;border-radius:24px 24px 0 0;
              box-shadow:0 -6px 24px rgba(0,0,0,.1);justify-content:flex-start;
              overflow-y:auto;z-index:20;animation:panelUp .5s cubic-bezier(.22,1,.36,1) both}
  @keyframes panelUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
  .leaf-bottom{display:block;position:absolute;bottom:-120px;right:-65px;
               width:60vw;height:auto;transform:rotate(148deg) scaleX(-1);
               pointer-events:none;z-index:22}
  .ring{width:96px;height:96px}
  .ring-num{font-size:1.7rem}
  .form-title{font-size:1.75rem}
  .actions{flex-direction:column}
  .btn{text-align:center}}
</style></head><body>
<div class="card">

  <!-- LEAF CHÍNH -->
  <svg class="leaf-layer" viewBox="0 0 940 590" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <defs>
      <linearGradient id="lbg" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#12381f"/>
        <stop offset="30%" stop-color="#2d7a45"/>
        <stop offset="65%" stop-color="#3fa85e"/>
        <stop offset="100%" stop-color="#60cc7c"/>
      </linearGradient>
      <linearGradient id="lhl" x1="0%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="#80e89c" stop-opacity=".22"/>
        <stop offset="100%" stop-color="#1a4d2e" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="white" stop-opacity="0"/>
        <stop offset="42%" stop-color="white" stop-opacity=".2"/>
        <stop offset="58%" stop-color="white" stop-opacity=".24"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </linearGradient>
      <filter id="leafShadow" x="-15%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="8" dy="14" stdDeviation="20" flood-color="#0f3020" flood-opacity=".22"/>
      </filter>
      <clipPath id="lclip"><path d="${LEAF}"/></clipPath>
    </defs>
    <g id="leafGroup" filter="url(#leafShadow)">
      <g clip-path="url(#lclip)">
        <rect x="-25" y="0" width="480" height="760" fill="url(#lbg)"/>
        <rect x="-25" y="0" width="480" height="760" fill="url(#lhl)"/>
        <g fill="none" stroke-linecap="round">
          <path class="vm d0" d="M210 16 C210 220,210 520,210 742" stroke="rgba(255,255,255,.48)" stroke-width="2.8"/>
          <path class="vp d1" d="M210 118 C174 138,132 157,62 182" stroke="rgba(255,255,255,.30)" stroke-width="1.7"/>
          <path class="vp d2" d="M210 188 C168 212,122 234,46 265" stroke="rgba(255,255,255,.28)" stroke-width="1.6"/>
          <path class="vp d3" d="M210 262 C166 288,118 310,38 345" stroke="rgba(255,255,255,.26)" stroke-width="1.5"/>
          <path class="vp d4" d="M210 336 C168 362,126 380,50 412" stroke="rgba(255,255,255,.24)" stroke-width="1.4"/>
          <path class="vp d5" d="M210 405 C176 426,142 443,82 468" stroke="rgba(255,255,255,.22)" stroke-width="1.3"/>
          <path class="vp d6" d="M210 468 C186 482,160 496,116 514" stroke="rgba(255,255,255,.19)" stroke-width="1.1"/>
          <path class="vp d7" d="M210 524 C194 534,174 544,144 555" stroke="rgba(255,255,255,.15)" stroke-width=".9"/>
          <path class="vp d1" d="M210 118 C246 138,288 157,358 182" stroke="rgba(255,255,255,.30)" stroke-width="1.7"/>
          <path class="vp d2" d="M210 188 C252 212,298 234,374 265" stroke="rgba(255,255,255,.28)" stroke-width="1.6"/>
          <path class="vp d3" d="M210 262 C254 288,302 310,382 345" stroke="rgba(255,255,255,.26)" stroke-width="1.5"/>
          <path class="vp d4" d="M210 336 C252 362,294 380,370 412" stroke="rgba(255,255,255,.24)" stroke-width="1.4"/>
          <path class="vp d5" d="M210 405 C244 426,278 443,338 468" stroke="rgba(255,255,255,.22)" stroke-width="1.3"/>
          <path class="vp d6" d="M210 468 C234 482,260 496,304 514" stroke="rgba(255,255,255,.19)" stroke-width="1.1"/>
          <path class="vp d7" d="M210 524 C226 534,246 544,276 555" stroke="rgba(255,255,255,.15)" stroke-width=".9"/>
        </g>
        <rect id="leafSheen" x="-80" y="0" width="300" height="760" fill="url(#sheen)"/>
        <path d="${LEAF}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="10"/>
      </g>
      <path d="M210 744 C206 768,204 790,210 806" stroke="#12381f" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".55"/>
    </g>
  </svg>

  <!-- BRAND CORNER -->
  <a class="brand-corner" href="/" aria-label="Quỳnh Phụ Tôi — Về trang chủ">
    <div class="brand-icon">
      <img src="/img/patterns/logo.png" alt="" />
    </div>
    <span class="brand-corner-name">Quỳnh Phụ Tôi</span>
  </a>

  <!-- FORM PANEL -->
  <div class="form-panel">
    <div class="title-row">
      <div class="title-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div class="form-title">Bảo vệ hệ thống</div>
    </div>
    <div class="form-sub">Tải lại trang quá nhanh — vui lòng đợi một chút</div>

    <div class="ring">
      <svg viewBox="0 0 112 112">
        <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(63,168,94,.15)" stroke-width="7"/>
        <circle id="arc" cx="56" cy="56" r="48" fill="none" stroke="var(--g3)" stroke-width="7"
                stroke-linecap="round" stroke-dasharray="301.593" stroke-dashoffset="0"/>
      </svg>
      <div class="ring-num" id="cd">${clock}</div>
    </div>

    <p class="desc">
      Hệ thống phát hiện việc tải lại trang bất thường nên tạm dừng để bảo vệ máy chủ và trải nghiệm của những người dân khác.<br/><br/>
      Vui lòng chờ <b>${human}</b> — trang sẽ <b>tự động tải lại</b>. Tải lại liên tục sẽ khiến thời gian chờ <b>tăng dần</b>.
    </p>

    <div class="actions">
      <a class="btn btn-primary" href="/">Về trang chủ</a>
      <a class="btn btn-ghost" href="/">Thử lại ngay</a>
    </div>
    <div class="note">Nếu bạn cho rằng đây là nhầm lẫn, vui lòng thử lại sau ít phút.</div>
  </div>

  <!-- LÁ DƯỚI (mobile only) -->
  <svg class="leaf-bottom" viewBox="-5 8 430 740" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lbg2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#60cc7c"/>
        <stop offset="50%" stop-color="#2d7a45"/>
        <stop offset="100%" stop-color="#12381f"/>
      </linearGradient>
    </defs>
    <g opacity="0.11">
      <path d="${LEAF}" fill="url(#lbg2)"/>
      <g fill="none" stroke-linecap="round">
        <path d="M210 16 C210 220,210 520,210 742" stroke="rgba(255,255,255,.55)" stroke-width="2.5"/>
        <path d="M210 118 C174 138,132 157,62 182" stroke="rgba(255,255,255,.35)" stroke-width="1.4"/>
        <path d="M210 118 C246 138,288 157,358 182" stroke="rgba(255,255,255,.35)" stroke-width="1.4"/>
        <path d="M210 262 C166 288,118 310,38 345" stroke="rgba(255,255,255,.28)" stroke-width="1.2"/>
        <path d="M210 262 C254 288,302 310,382 345" stroke="rgba(255,255,255,.28)" stroke-width="1.2"/>
      </g>
    </g>
  </svg>

</div>
<script>
(function(){
  var total=${sec},s=${sec},C=301.593,
      num=document.getElementById('cd'),arc=document.getElementById('arc');
  function fmt(x){return x>=60?(Math.floor(x/60)+':'+String(x%60).padStart(2,'0')):String(x);}
  var t=setInterval(function(){
    s--;
    if(num)num.textContent=fmt(s>0?s:0);
    if(arc)arc.style.strokeDashoffset=String(C*(1-Math.max(s,0)/total));
    if(s<=0){clearInterval(t);location.href='/';}
  },1000);
})();
</script>
</body></html>`;
}
