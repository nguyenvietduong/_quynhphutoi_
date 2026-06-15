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
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="${sec}; url=/" />
<title>Tạm dừng truy cập — Cổng thông tin Quỳnh Phụ</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
<style>
  :root{--navy:#0F4C81;--navy-deep:#062340;--navy-pale:#EAF1F8;--teal:#00A98F;--teal-dark:#007D69;
        --indigo:#6366F1;--indigo-dark:#4338CA;--yellow:#FCD34D;--gray-text:#334155;--border:#E5E8ED}
  *{box-sizing:border-box}
  html,body{overflow-x:hidden;max-width:100%}
  body{margin:0;min-height:100vh;min-height:100svh;display:grid;place-items:center;padding:24px;position:relative;
       font-family:'Be Vietnam Pro',system-ui,sans-serif;color:var(--navy-deep);
       background:radial-gradient(at 20% 30%,#F0F7FF 0%,transparent 60%),
                  radial-gradient(at 80% 70%,#EAF1F8 0%,transparent 60%),
                  linear-gradient(135deg,#F0F7FF 0%,#E6F7F3 60%,#EAF1F8 100%)}
  .blob{position:absolute;border-radius:50%;filter:blur(70px);z-index:0;animation:drift 18s ease-in-out infinite}
  .blob.t{width:340px;height:340px;top:-110px;left:6%;background:var(--teal);opacity:.18}
  .blob.i{width:240px;height:240px;top:28%;left:30%;background:var(--indigo);opacity:.15;animation-delay:-8s}
  .blob.y{width:260px;height:260px;bottom:-90px;left:60%;background:var(--yellow);opacity:.16;animation-delay:-12s}
  .art{position:absolute;top:0;bottom:0;right:0;width:240px;z-index:0;pointer-events:none;opacity:.85;
       background:url('/img/vectors/rice-halftone.svg') no-repeat right center / contain}
  @keyframes drift{0%,100%{transform:translate(0,0)}33%{transform:translate(20px,-18px)}66%{transform:translate(-14px,12px)}}
  @media (prefers-reduced-motion:reduce){.blob{animation:none}}
  .wrap{position:relative;z-index:1;width:100%;max-width:560px;text-align:center}
  .brand{display:inline-flex;align-items:center;gap:11px;margin-bottom:30px}
  .brand img{width:46px;height:46px;border-radius:11px;box-shadow:0 4px 16px -6px rgba(6,35,64,.25)}
  .brand .nm{text-align:left;line-height:1.2}
  .brand .nm b{font-size:16px;color:var(--navy-deep);font-weight:800}
  .brand .nm small{display:block;font-size:11.5px;color:var(--gray-text)}
  .eyebrow{display:inline-flex;align-items:center;gap:9px;font-family:'Space Grotesk',sans-serif;font-weight:700;
           font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:var(--teal-dark);margin-bottom:18px}
  .eyebrow::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--yellow)}
  .ring{position:relative;width:128px;height:128px;margin:0 auto 24px}
  .ring svg{width:100%;height:100%;transform:rotate(-90deg)}
  .ring__num{position:absolute;inset:0;display:grid;place-items:center;font-family:'Space Grotesk',sans-serif;
             font-size:30px;font-weight:700;color:var(--navy);font-variant-numeric:tabular-nums}
  h1{font-size:30px;line-height:1.18;letter-spacing:-.5px;color:var(--navy);margin:0 0 14px;font-weight:800}
  p{max-width:460px;margin:0 auto 10px;color:var(--gray-text);line-height:1.65;font-size:15px}
  .line{display:block;width:64px;height:3px;border-radius:2px;background:var(--yellow);margin:18px auto 6px}
  .actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px}
  .btn{display:inline-block;padding:12px 26px;border-radius:100px;text-decoration:none;font-weight:700;font-size:14px;
       transition:transform .25s,box-shadow .25s}
  .btn--primary{background:linear-gradient(135deg,var(--indigo),var(--indigo-dark));color:#fff;
                box-shadow:0 14px 32px -10px rgba(99,102,241,.5)}
  .btn--primary:hover{transform:translateY(-2px)}
  .btn--ghost{border:1.5px solid var(--teal);color:var(--navy);background:transparent}
  .btn--ghost:hover{border-color:var(--yellow)}
  .note{font-size:12.5px;color:var(--gray-text);opacity:.8;margin-top:22px}
  @media (max-width:640px){
    body{padding:20px 18px;align-content:center}
    .art{display:none}
    .blob{filter:blur(56px)}
    .blob.t{width:220px;height:220px;left:-40px;top:-80px}
    .blob.i{width:160px;height:160px}
    .blob.y{width:200px;height:200px;left:auto;right:-50px;bottom:-70px}
    .brand{margin-bottom:22px}
    .brand img{width:40px;height:40px}
    .brand .nm b{font-size:14.5px}
    .ring{width:108px;height:108px;margin-bottom:20px}
    .ring__num{font-size:26px}
    h1{font-size:23px}
    p{font-size:14px}
    .actions{flex-direction:column;align-items:stretch}
    .btn{width:100%;text-align:center}
  }
</style></head><body>
  <span class="blob t"></span><span class="blob i"></span><span class="blob y"></span><span class="art"></span>
  <div class="wrap">
    <span class="brand">
      <img src="/img/patterns/logo.png" alt="Cổng thông tin Quỳnh Phụ" />
      <span class="nm"><b>Cổng thông tin Quỳnh Phụ</b><small>Cộng đồng xã Quỳnh Phụ · Thái Bình</small></span>
    </span>
    <div class="eyebrow">Bảo vệ hệ thống</div>
    <div class="ring">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="56" fill="none" stroke="var(--navy-pale)" stroke-width="9" />
        <circle id="arc" cx="64" cy="64" r="56" fill="none" stroke="var(--yellow)" stroke-width="9" stroke-linecap="round"
                stroke-dasharray="351.858" stroke-dashoffset="0" />
      </svg>
      <div class="ring__num" id="cd">${clock}</div>
    </div>
    <h1>Bạn thao tác hơi nhanh</h1>
    <p>Hệ thống phát hiện việc tải lại trang liên tục bất thường nên tạm dừng để bảo vệ máy chủ và trải nghiệm của những người dân khác.</p>
    <p>Vui lòng chờ khoảng <b>${human}</b> — trang sẽ <b>tự động tải lại</b>. Tải lại liên tục sẽ khiến thời gian chờ <b>tăng dần</b>.</p>
    <span class="line"></span>
    <div class="actions">
      <a class="btn btn--primary" href="/">Về trang chủ</a>
      <a class="btn btn--ghost" href="/">Thử lại ngay</a>
    </div>
    <div class="note">Nếu bạn cho rằng đây là nhầm lẫn, vui lòng thử lại sau ít phút.</div>
  </div>
<script>
  (function(){
    var total=${sec},s=${sec},C=351.858,
        num=document.getElementById('cd'),arc=document.getElementById('arc');
    function fmt(x){return x>=60?(Math.floor(x/60)+':'+String(x%60).padStart(2,'0')):String(x);}
    var t=setInterval(function(){
      s--;
      if(num)num.textContent=fmt(s>0?s:0);
      if(arc)arc.style.strokeDashoffset=String(C*(1-s/total));
      if(s<=0){clearInterval(t);location.href='/';}
    },1000);
  })();
</script>
</body></html>`;
}
