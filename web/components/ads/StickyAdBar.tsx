"use client";

// Thanh quảng cáo nổi đáy màn hình (slider). Bấm ✕ → THU NHỎ thành 1 nút ở góc
// (không che màn, không mất quảng cáo); bấm nút đó để mở lại NGAY.
// Trạng thái ẩn KHÔNG lưu qua reload → tải lại trang là quảng cáo HIỆN LẠI.
// Nếu để yên (không reload), sau REAPPEAR_MS (mặc định 5 phút) thanh sẽ TỰ BUNG lại.
// Vòng xoay TÔN TRỌNG TRỌNG SỐ ƯU TIÊN (weight): ad trọng số cao hiện trước + nhiều hơn.
import { useEffect, useMemo, useRef, useState } from "react";

type Ad = { id: string; advertiser: string; title: string; imageDesktop: string; imageMobile: string | null; weight?: number };

const REAPPEAR_MS = 5 * 60 * 1000;             // 5 phút → tự hiện lại (trong cùng phiên xem)

// Smooth weighted round-robin: trả về thứ tự xoay (dài = tổng trọng số) sao cho ad
// trọng số cao xuất hiện nhiều hơn nhưng vẫn xen kẽ mượt (không gom cụm cùng 1 ad).
function weightedOrder(ads: Ad[]): Ad[] {
  if (ads.length <= 1) return ads;
  const state = ads.map((ad) => ({ ad, eff: Math.max(1, ad.weight || 1), cur: 0 }));
  const total = state.reduce((s, x) => s + x.eff, 0);
  const seq: Ad[] = [];
  for (let n = 0; n < total; n++) {
    let best = state[0];
    for (const x of state) { x.cur += x.eff; if (x.cur > best.cur) best = x; }
    best.cur -= total;
    seq.push(best.ad);
  }
  return seq;
}

export function StickyAdBar() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [idx, setIdx] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  // Vòng xoay theo trọng số ưu tiên (ổn định cho tới khi danh sách ads đổi).
  const order = useMemo(() => weightedOrder(ads), [ads]);

  // Lấy tất cả quảng cáo đang chạy.
  useEffect(() => {
    let alive = true;
    fetch("/api/ads?placement=all", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive) setAds(d.ads ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Khi đang thu nhỏ → hẹn giờ tự bung lại sau 5 phút (chỉ trong phiên xem hiện tại;
  // reload trang sẽ tự hiện lại vì state khởi tạo mặc định là "đang mở").
  useEffect(() => {
    if (!collapsed) return;
    const t = setTimeout(() => setCollapsed(false), REAPPEAR_MS);
    return () => clearTimeout(t);
  }, [collapsed]);

  // Tự chuyển slide (khi đang mở) — chạy theo vòng xoay có trọng số.
  useEffect(() => {
    if (collapsed || order.length <= 1) return;
    const iv = setInterval(() => setIdx((i) => (i + 1) % order.length), 5000);
    return () => clearInterval(iv);
  }, [collapsed, order.length]);

  // Đếm lượt hiển thị (mỗi quảng cáo 1 lần, khi đang mở).
  useEffect(() => {
    if (collapsed) return;
    const ad = order[idx];
    if (!ad || seen.current.has(ad.id)) return;
    seen.current.add(ad.id);
    fetch(`/api/ads/${ad.id}/impression`, { method: "POST", keepalive: true }).catch(() => {});
  }, [collapsed, idx, order]);

  function collapse() { setCollapsed(true); }
  function expand() { setCollapsed(false); }

  if (ads.length === 0) return null;

  // Đã thu nhỏ → nút nhỏ ở góc.
  if (collapsed) {
    return (
      <button type="button" className="qp-stickybar-tab" onClick={expand} aria-label="Mở quảng cáo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1z" /><path d="M18 9a3 3 0 0 1 0 6" /></svg>
        <span>Ưu đãi</span>
      </button>
    );
  }

  const ad = order[Math.min(idx, order.length - 1)];
  const activeDot = ads.findIndex((a) => a.id === ad.id);
  return (
    <div className="qp-stickybar" role="complementary" aria-label="Quảng cáo">
      <a className="qp-stickybar__main" key={ad.id} href={`/api/ads/${ad.id}/click`} rel="nofollow">
        <span className="qp-stickybar__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.imageDesktop} alt="" loading="lazy" />
        </span>
        <span className="qp-stickybar__text">
          <span className="qp-stickybar__label">Quảng cáo</span>
          <span className="qp-stickybar__title">{ad.title}</span>
          <span className="qp-stickybar__advertiser">{ad.advertiser}</span>
        </span>
        <span className="qp-stickybar__cta" aria-hidden>Xem →</span>
      </a>

      {ads.length > 1 && (
        <span className="qp-stickybar__dots" aria-hidden>
          {ads.map((_, i) => <span key={i} className={`qp-stickybar__dot${i === activeDot ? " is-active" : ""}`} />)}
        </span>
      )}

      <button type="button" className="qp-stickybar__close" onClick={collapse} aria-label="Thu nhỏ quảng cáo">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 12h14" /></svg>
      </button>
    </div>
  );
}
