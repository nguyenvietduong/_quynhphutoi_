"use client";

// reCAPTCHA v2 — ô tick "Tôi không phải robot".
// Script api.js nạp ở app/layout.tsx (khi có site key). Render tường minh bằng grecaptcha.render().
// Chưa cấu hình key → không hiện gì, getToken() trả "" (server cũng bỏ qua khi chưa có secret).
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

type Grecaptcha = {
  render: (
    el: HTMLElement,
    opts: { sitekey: string; theme?: string; size?: string; callback?: (t: string) => void; "expired-callback"?: () => void },
  ) => number;
  getResponse: (id?: number) => string;
  reset: (id?: number) => void;
};

function grecaptcha(): Grecaptcha | undefined {
  return (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
}

export type RecaptchaHandle = {
  /** Token hiện tại (rỗng nếu người dùng chưa tick / đã hết hạn). */
  getToken: () => string;
  /** Xóa tick để lấy token mới (token v2 dùng 1 lần). */
  reset: () => void;
};

// Render ô tick v2; form lấy token qua ref tại lúc submit.
export const Recaptcha = forwardRef<RecaptchaHandle, { className?: string }>(function Recaptcha(
  { className },
  ref,
) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tryRender = (): boolean => {
      const g = grecaptcha();
      if (!g || !g.render || !boxRef.current) return false;
      if (widgetId.current !== null) return true;
      // tránh "reCAPTCHA already rendered" khi StrictMode mount lại
      if (boxRef.current.childElementCount > 0) return true;
      widgetId.current = g.render(boxRef.current, { sitekey: RECAPTCHA_SITE_KEY });
      return true;
    };

    if (!tryRender()) {
      timer = setInterval(() => {
        if (cancelled) return;
        if (tryRender() && timer) {
          clearInterval(timer);
          timer = null;
        }
      }, 200);
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getToken: () => {
        const g = grecaptcha();
        return g && widgetId.current !== null ? g.getResponse(widgetId.current) || "" : "";
      },
      reset: () => {
        const g = grecaptcha();
        if (g && widgetId.current !== null) g.reset(widgetId.current);
      },
    }),
    [],
  );

  if (!RECAPTCHA_SITE_KEY) return null;
  return <div ref={boxRef} className={className} />;
});
