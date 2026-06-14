"use client";

// Ô quảng cáo. Ưu tiên quảng cáo tự bán (direct); chỗ chưa bán → fallback AdSense.
// Có nhãn "Quảng cáo", đếm impression (khi lọt màn hình) + click (qua /api/ads/.../click).
import { useEffect, useRef, useState } from "react";
import { AdSenseUnit } from "./AdSenseUnit";

type Ad = { id: string; advertiser: string; title: string; imageDesktop: string; imageMobile: string | null; weight: number };
type Placement = "home-banner" | "detail-aside" | "in-feed" | "footer";

function pickWeighted(list: Ad[]): Ad {
  const total = list.reduce((s, a) => s + Math.max(1, a.weight), 0);
  let r = Math.random() * total;
  for (const a of list) { r -= Math.max(1, a.weight); if (r <= 0) return a; }
  return list[0];
}

export function AdSlot({ placement, className }: { placement: Placement; className?: string }) {
  const [ad, setAd] = useState<Ad | null | undefined>(undefined); // undefined = đang tải
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/ads?placement=${placement}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive) setAd((d.ads ?? []).length ? pickWeighted(d.ads) : null); })
      .catch(() => { if (alive) setAd(null); });
    return () => { alive = false; };
  }, [placement]);

  useEffect(() => {
    if (!ad || seen.current || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !seen.current) {
        seen.current = true;
        fetch(`/api/ads/${ad.id}/impression`, { method: "POST", keepalive: true }).catch(() => {});
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [ad]);

  if (ad === undefined) return null;                  // đang tải → chưa chiếm chỗ
  if (ad === null) {                                   // chưa bán → thử AdSense
    return <AdSenseUnit className={className} />;
  }

  const variant = placement === "in-feed" ? "native" : placement === "detail-aside" ? "box" : "banner";
  const href = `/api/ads/${ad.id}/click`;

  if (variant === "native") {
    // Thẻ "Tài trợ" trông giống card tin tức.
    return (
      <article ref={ref} className={`qp-newscard qp-ad-native ${className ?? ""}`}>
        <a className="qp-newscard__media" href={href} rel="nofollow" aria-label={ad.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.imageDesktop} alt="" loading="lazy" />
          <span className="qp-ad__label">Tài trợ</span>
        </a>
        <div className="qp-newscard__body">
          <h3 className="qp-newscard__title"><a href={href} rel="nofollow">{ad.title}</a></h3>
          <div className="qp-newscard__meta"><span>{ad.advertiser}</span></div>
        </div>
      </article>
    );
  }

  return (
    <div ref={ref} className={`qp-ad qp-ad--${variant} ${className ?? ""}`}>
      <a href={href} rel="nofollow" aria-label={`Quảng cáo: ${ad.advertiser}`}>
        <picture>
          {ad.imageMobile && <source media="(max-width: 640px)" srcSet={ad.imageMobile} />}
          <img src={ad.imageDesktop} alt={ad.title} loading="lazy" />
        </picture>
        <span className="qp-ad__label">Quảng cáo</span>
      </a>
    </div>
  );
}
