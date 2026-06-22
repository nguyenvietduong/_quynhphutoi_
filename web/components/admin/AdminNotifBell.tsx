"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NotifItem = {
  id: string; type: string; title: string; href: string;
  actorName?: string; read: boolean; createdAt: string;
};

function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)   return "vừa xong";
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  return `${Math.floor(sec / 86400)} ngày trước`;
}

const TYPE_ICON: Record<string, string> = {
  post_pending:  "📝",
  post_approved: "✅",
  post_rejected: "❌",
  comment:       "💬",
  like:          "❤️",
  announcement:  "📢",
};

export function AdminNotifBell() {
  const [open, setOpen]     = useState(false);
  const [items, setItems]   = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  function fetchNotifs() {
    fetch("/api/notifications?limit=15")
      .then(r => r.ok ? r.json() : { items: [], unread: 0 })
      .then(d => { setItems(d.items ?? []); setUnread(d.unread ?? 0); })
      .catch(() => {});
  }

  useEffect(() => { fetchNotifs(); }, []);

  // Click ngoài → đóng
  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems(cur => cur.map(n => ({ ...n, read: true })));
    setUnread(0);
  }

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setItems(cur => cur.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(cur => Math.max(0, cur - 1));
  }

  return (
    <div className="qp-admin-bell" ref={ref}>
      <button
        type="button"
        className={`qp-admin-bell__btn${open ? " is-open" : ""}`}
        aria-label="Thông báo"
        aria-expanded={open}
        onClick={() => { setOpen(v => !v); if (!open) fetchNotifs(); }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="qp-admin-bell__badge">{unread > 99 ? "99+" : unread}</span>
        )}
      </button>

      {open && (
        <div className="qp-admin-bell__panel" role="dialog" aria-label="Thông báo">
          <div className="qp-admin-bell__head">
            <span className="qp-admin-bell__head-title">Thông báo</span>
            {unread > 0 && (
              <button type="button" className="qp-admin-bell__readall" onClick={markAllRead}>
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="qp-admin-bell__list">
            {items.length === 0 ? (
              <div className="qp-admin-bell__empty">Không có thông báo nào</div>
            ) : items.map(n => (
              <Link
                key={n.id}
                href={n.href}
                className={`qp-admin-bell__item${n.read ? "" : " is-unread"}`}
                onClick={() => { if (!n.read) markOne(n.id); setOpen(false); }}
              >
                <span className="qp-admin-bell__item-icon">{TYPE_ICON[n.type] ?? "🔔"}</span>
                <span className="qp-admin-bell__item-body">
                  <span className="qp-admin-bell__item-title">{n.title}</span>
                  <span className="qp-admin-bell__item-meta">
                    {n.actorName && <>{n.actorName} · </>}{timeAgo(n.createdAt)}
                  </span>
                </span>
                {!n.read && <span className="qp-admin-bell__dot" aria-hidden />}
              </Link>
            ))}
          </div>

          <div className="qp-admin-bell__foot">
            <Link href="/admin/thong-bao" onClick={() => setOpen(false)}>
              Xem tất cả thông báo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
