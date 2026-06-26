"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function RateLimitedPanel() {
  const params = useSearchParams();
  const initSec = Math.max(1, parseInt(params.get("seconds") ?? "60", 10));
  const from = params.get("from") ?? "dang-nhap";
  const [seconds, setSeconds] = useState(initSec);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const ready = seconds <= 0;

  return (
    <div className="form-panel">
      <div className="success-panel">
        <div
          className="success-icon"
          style={{ background: "linear-gradient(135deg, #fff3e0, #ffccbc)" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 28, height: 28, color: "#bf360c" }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div className="success-title" style={{ color: "#7f1d1d" }}>
          Quá nhiều yêu cầu
        </div>

        <p className="success-body">
          Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn.
          {ready ? (
            " Bạn có thể thử lại ngay bây giờ."
          ) : (
            <>
              {" "}Vui lòng chờ{" "}
              <strong style={{ color: "#bf360c" }}>{seconds}s</strong>
              {" "}trước khi thử lại.
            </>
          )}
        </p>

        {ready ? (
          <Link
            href={`/${from}`}
            className="btn-login"
            style={{ textDecoration: "none", textAlign: "center", display: "block" }}
          >
            Thử lại
          </Link>
        ) : (
          <button className="btn-login" type="button" disabled>
            Thử lại ({seconds}s)
          </button>
        )}

        <Link href="/" className="success-link" style={{ marginTop: 12 }}>
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}
