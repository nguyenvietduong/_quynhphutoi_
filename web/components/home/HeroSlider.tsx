"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type HeroSlide = {
  id: string;
  eyebrow: string;
  headline: string;
  lead: string;
  image: string;
  imageAlt?: string;
  cta: { label: string; href: string };
  byline?: { avatar: string; role: string; name: string; time: string };
};

// Slide mặc định luôn đứng đầu (không phụ thuộc dữ liệu). Các slide còn lại do
// trang chủ truyền vào qua prop `articleSlides` (lấy từ bài viết "Nổi bật"/mới nhất).
const DEFAULT_SLIDE: HeroSlide = {
  id: "chao-mung",
  eyebrow: "Chào mừng · Quỳnh Phụ",
  headline: "Trang cộng đồng Quỳnh Phụ",
  lead: "Một điểm đến số duy nhất cho người dân Quỳnh Phụ — tra cứu thông báo, việc làm, tin tức và kết nối cộng đồng nhanh chóng, thuận tiện.",
  image: "/img/patterns/slider-default.png",
  imageAlt: "Trang cộng đồng Quỳnh Phụ",
  cta: { label: "Khám phá trang cộng đồng", href: "/tong-quan" },
  byline: { avatar: "QP", role: "Trang cộng đồng", name: "Phục vụ người dân", time: "Trực tuyến 24/7" },
};

const FLOATS = [
  { top: "15%", left: "10%", size: 8, color: "is-teal", delay: "0s" },
  { top: "70%", left: "8%", size: 6, color: "is-indigo", delay: "-4s" },
  { top: "25%", left: "45%", size: 5, color: "is-yellow", delay: "-8s" },
  { top: "80%", left: "55%", size: 7, color: "is-teal", delay: "-12s" },
  { top: "35%", left: "88%", size: 5, color: "is-indigo", delay: "-2s" },
  { top: "60%", left: "92%", size: 4, color: "is-yellow", delay: "-6s" },
  { top: "10%", left: "70%", size: 4, color: "is-teal", delay: "-10s" },
  { top: "90%", left: "30%", size: 5, color: "is-indigo", delay: "-14s" },
];

const INTERVAL = 7000;

export function HeroSlider({ articleSlides = [] }: { articleSlides?: HeroSlide[] }) {
  const SLIDES: HeroSlide[] = [DEFAULT_SLIDE, ...articleSlides];
  const total = SLIDES.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const touchStartX = useRef(0);
  const reduceMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }, []);

  const goTo = useCallback(
    (idx: number) => {
      setActive(((idx % total) + total) % total);
      setProgressKey((k) => k + 1);
    },
    [total],
  );

  // Tự chạy
  useEffect(() => {
    if (reduceMotion.current || paused || total <= 1) return;
    const t = window.setTimeout(() => {
      setActive((a) => (a + 1) % total);
      setProgressKey((k) => k + 1);
    }, INTERVAL);
    return () => window.clearTimeout(t);
  }, [active, paused, total]);

  // Phím mũi tên
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo(active - 1);
      if (e.key === "ArrowRight") goTo(active + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) goTo(active + (delta < 0 ? 1 : -1));
  };

  return (
    <section
      className="qp-hero"
      aria-roledescription="carousel"
      aria-label="Tin nổi bật"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Lớp texture chấm */}
      <div className="qp-hero__texture" aria-hidden />

      {/* Đốm sáng trôi */}
      <div className="qp-hero__floats" aria-hidden>
        {FLOATS.map((f, i) => (
          <span
            key={i}
            className={`qp-hero__float ${f.color}`}
            style={{ top: f.top, left: f.left, width: f.size, height: f.size, animationDelay: f.delay }}
          />
        ))}
      </div>

      {/* Bóng tre góc phải */}
      <svg className="qp-hero__bamboo" viewBox="0 0 540 720" aria-hidden>
        <g fill="#34D4B8">
          <rect x="100" y="50" width="6" height="640" rx="3" />
          <rect x="220" y="20" width="7" height="680" rx="3" />
          <rect x="340" y="80" width="6" height="600" rx="3" />
          <rect x="450" y="40" width="5" height="660" rx="3" />
          <ellipse cx="130" cy="240" rx="35" ry="9" transform="rotate(-25 130 240)" />
          <ellipse cx="80" cy="240" rx="35" ry="9" transform="rotate(25 80 240)" />
          <ellipse cx="250" cy="220" rx="38" ry="10" transform="rotate(-25 250 220)" />
          <ellipse cx="200" cy="220" rx="38" ry="10" transform="rotate(25 200 220)" />
          <ellipse cx="370" cy="260" rx="35" ry="9" transform="rotate(-25 370 260)" />
          <ellipse cx="320" cy="260" rx="35" ry="9" transform="rotate(25 320 260)" />
          <ellipse cx="140" cy="400" rx="38" ry="10" transform="rotate(-25 140 400)" />
          <ellipse cx="90" cy="400" rx="38" ry="10" transform="rotate(25 90 400)" />
          <ellipse cx="260" cy="420" rx="40" ry="11" transform="rotate(-25 260 420)" />
          <ellipse cx="210" cy="420" rx="40" ry="11" transform="rotate(25 210 420)" />
        </g>
      </svg>

      {/* Track trượt ngang */}
      <div
        className="qp-hero__track"
        style={{ width: `${total * 100}%`, transform: `translateX(-${active * (100 / total)}%)` }}
      >
        {SLIDES.map((slide, i) => (
          <article
            key={slide.id}
            className="qp-hero__slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${total}`}
            aria-hidden={i !== active}
            style={{ flex: `0 0 ${100 / total}%` }}
          >
            <Image
              className="qp-hero__img"
              src={slide.image}
              alt={slide.imageAlt ?? ""}
              fill
              sizes="100vw"
              priority={i === 0}
            />
            <div className="qp-hero__overlay" aria-hidden />

            <div className="container-wide qp-hero__inner">
              <div className="qp-hero__copy">
                <span className="type-tag qp-hero__eyebrow">
                  <span className="qp-hero__eyebrow-dot" aria-hidden />
                  {slide.eyebrow}
                </span>
                <h1 className="type-display-l qp-hero__headline">{slide.headline}</h1>
                <p className="qp-hero__lead">{slide.lead}</p>
                {slide.byline && (
                  <div className="qp-hero__byline">
                    <span className="qp-hero__byline-avatar" aria-hidden>{slide.byline.avatar}</span>
                    <span>{slide.byline.role}</span>
                    <span className="qp-hero__byline-sep">·</span>
                    <span>{slide.byline.name}</span>
                    <span className="qp-hero__byline-sep">·</span>
                    <span>{slide.byline.time}</span>
                  </div>
                )}
                <Link className="qp-btn-primary qp-hero__cta" href={slide.cta.href}>
                  {slide.cta.label} <span className="qp-arrow">→</span>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Tabs chấm */}
      <div className="qp-hero__tabs" role="tablist" aria-label="Chọn slide">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Đi tới slide ${i + 1}: ${s.eyebrow}`}
            className={`qp-hero__tab${i === active ? " is-active" : ""}`}
            onClick={() => goTo(i)}
          >
            <span className="qp-hero__tab-bar" />
          </button>
        ))}
      </div>

      {/* Thanh tiến trình */}
      <div className="qp-hero__progress" aria-hidden>
        <div
          key={progressKey}
          className="qp-hero__progress-bar"
          style={{ animationDuration: `${INTERVAL}ms`, animationPlayState: paused ? "paused" : "running" }}
        />
      </div>
    </section>
  );
}
