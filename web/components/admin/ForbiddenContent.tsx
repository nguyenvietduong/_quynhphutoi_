"use client";

import Link from "next/link";

export function ForbiddenContent() {
  return (
    <section className="qp-403">
      <div className="qp-403__icon-wrap">
        <span className="qp-403__ring" />
        <span className="qp-403__ring" />
        <span className="qp-403__ring" />
        <div className="qp-403__icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      <span className="qp-403__code" aria-hidden>403</span>
      <h1 className="type-h1">Không có quyền truy cập</h1>
      <p className="qp-403__lead">
        Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu cần được cấp quyền.
      </p>
      <div className="qp-403__actions">
        <button type="button" className="qp-btn-outline" onClick={() => window.history.back()}>
          ← Quay lại
        </button>
        <Link href="/admin" className="qp-btn-primary">Bảng điều khiển</Link>
      </div>
    </section>
  );
}
