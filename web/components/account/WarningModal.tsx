"use client";

import { useState } from "react";
import type { WarningRow } from "@/lib/user-warnings";

type Props = {
  initialWarnings: WarningRow[];
  isBanned: boolean;
};

const MODULE_LABEL: Record<string, string> = {
  "tin-tuc": "Tin tức",
  "viec-lam": "Việc làm",
  "mua-ban": "Mua bán",
  "tim-do-roi": "Tìm đồ rơi",
};

export function WarningModal({ initialWarnings, isBanned }: Props) {
  const [warnings, setWarnings] = useState<WarningRow[]>(initialWarnings);
  const [dismissed, setDismissed] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Không hiện nếu không có cảnh báo, hoặc đã dismiss (chỉ khi không bị khóa).
  if (warnings.length === 0) return null;
  if (dismissed && !isBanned) return null;

  const count = warnings.length;

  async function deleteArticle(w: WarningRow) {
    setDeleting(w.id);
    try {
      const res = await fetch(`/api/user/articles/${w.articleSlug}`, { method: "DELETE" });
      if (res.ok) {
        setWarnings((cur) => cur.filter((x) => x.id !== w.id));
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="wm-overlay" role="dialog" aria-modal="true" aria-labelledby="wm-title">
      <div className="wm-card">

        {/* Header */}
        <div className="wm-header">
          <span className="wm-icon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L2 20h20L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(217,119,6,0.12)"/>
              <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="12" cy="17" r="1.1" fill="currentColor"/>
            </svg>
          </span>
          <div>
            <h2 id="wm-title" className="wm-title">Vi phạm nội quy cộng đồng</h2>
            <p className="wm-subtitle">
              Tài khoản của bạn đang có{" "}
              <strong>{count} cảnh báo{count >= 3 ? " (đã đạt giới hạn)" : ""}</strong>
            </p>
          </div>
        </div>

        {/* Banned banner */}
        {isBanned && (
          <div className="wm-banned-banner">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3.5 3.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Tài khoản của bạn đã bị khóa do có quá nhiều vi phạm. Hãy xóa các bài vi phạm và liên hệ quản trị viên để được mở khóa.
          </div>
        )}

        {/* Explanation */}
        <p className="wm-desc">
          Các bài đăng dưới đây chứa nội dung vi phạm nội quy. Vui lòng xóa chúng để giải quyết cảnh báo.
          Mỗi bài xóa sẽ giảm 1 cảnh báo.
        </p>

        {/* Warning list */}
        <ul className="wm-list">
          {warnings.map((w) => (
            <li key={w.id} className="wm-item">
              <div className="wm-item__info">
                <span className="wm-item__module">{MODULE_LABEL[w.module] ?? w.module}</span>
                <span className="wm-item__title">{w.articleTitle}</span>
                <span className="wm-item__reason">{w.reason}</span>
              </div>
              <button
                type="button"
                className="wm-item__delete"
                disabled={deleting === w.id}
                onClick={() => deleteArticle(w)}
              >
                {deleting === w.id ? "Đang xóa…" : "Xóa bài"}
              </button>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="wm-footer">
          {!isBanned && (
            <button
              type="button"
              className="wm-dismiss"
              onClick={() => setDismissed(true)}
            >
              Đã hiểu, để sau
            </button>
          )}
          <p className="wm-footer__note">
            Vi phạm tiếp tục có thể dẫn đến khóa tài khoản vĩnh viễn.
          </p>
        </div>

      </div>
    </div>
  );
}
