"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TimeAgo } from "@/components/common/TimeAgo";

export type NotifItem = {
  id: string;
  type: "post_pending" | "post_approved" | "post_rejected" | "comment" | "like" | "announcement";
  title: string;
  href: string;
  read: boolean;
  createdAt: string;
};

type TabKey = "all" | "unread" | "post" | "comment" | "like" | "announcement";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",          label: "Tất cả" },
  { key: "unread",       label: "Chưa đọc" },
  { key: "post",         label: "Tin bài" },
  { key: "comment",      label: "Bình luận" },
  { key: "like",         label: "Lượt thích" },
  { key: "announcement", label: "Hệ thống" },
];

function matchesTab(n: NotifItem, tab: TabKey) {
  if (tab === "all") return true;
  if (tab === "unread") return !n.read;
  if (tab === "post") return n.type === "post_pending" || n.type === "post_approved" || n.type === "post_rejected";
  return n.type === tab;
}

function TypeIcon({ type }: { type: NotifItem["type"] }) {
  const p = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, width: 18, height: 18 };
  if (type === "like")          return <svg {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>;
  if (type === "comment")       return <svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-4-1L3 20l1-5.5a8.4 8.4 0 0 1-1-4A8.4 8.4 0 0 1 11.5 2 8.4 8.4 0 0 1 21 11.5z" /></svg>;
  if (type === "post_approved") return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>;
  if (type === "post_rejected") return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></svg>;
  if (type === "post_pending")  return <svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
  if (type === "announcement")  return <svg {...p}><path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1Z" /><path d="M19 9a4 4 0 0 1 0 6" /></svg>;
  return <svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
}

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export function NotifList({ initial }: { initial: NotifItem[] }) {
  const router = useRouter();
  const [items, setItems]       = useState<NotifItem[]>(initial);
  const [query, setQuery]       = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const unread = items.filter((n) => !n.read).length;

  const tabCounts = useMemo(() => {
    const c: Record<TabKey, number> = { all: 0, unread: 0, post: 0, comment: 0, like: 0, announcement: 0 };
    for (const n of items) {
      c.all++;
      if (!n.read) c.unread++;
      if (n.type === "post_pending" || n.type === "post_approved" || n.type === "post_rejected") c.post++;
      if (n.type === "comment")      c.comment++;
      if (n.type === "like")         c.like++;
      if (n.type === "announcement") c.announcement++;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      if (!matchesTab(n, activeTab)) return false;
      if (q) return n.title.toLowerCase().includes(q);
      return true;
    });
  }, [items, activeTab, query]);

  function openItem(n: NotifItem) {
    if (!n.read) {
      setItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      fetch(`/api/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    }
    router.push(n.href);
  }

  async function markAll() {
    setItems((cur) => cur.map((x) => ({ ...x, read: true })));
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  if (items.length === 0) {
    return (
      <div className="qp-notif-zero">
        <span className="qp-notif-zero__icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" width="40" height="40">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </span>
        <p className="qp-notif-zero__title">Chưa có thông báo nào</p>
        <p className="qp-notif-zero__desc">Khi có hoạt động liên quan tới bạn, thông báo sẽ xuất hiện ở đây.</p>
      </div>
    );
  }

  return (
    <div className="qp-acc-card qp-notif-card">
      {/* ── Toolbar: search + mark-all ── */}
      <div className="qp-notif-toolbar">
        <label className="qp-notif-searchbox" aria-label="Tìm trong thông báo">
          <span className="qp-notif-searchbox__icon"><IconSearch /></span>
          <input
            type="search"
            placeholder="Tìm trong thông báo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button type="button" className="qp-notif-searchbox__clear" onClick={() => setQuery("")} aria-label="Xóa">
              <IconClose />
            </button>
          )}
        </label>

        <button type="button" className="qp-notif-markall" onClick={markAll} disabled={unread === 0}>
          <IconCheck />
          <span>Đọc tất cả</span>
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="qp-notif-tabs" role="tablist" aria-label="Lọc thông báo">
        {TABS.map((tab) => {
          const count = tabCounts[tab.key];
          if (count === 0 && tab.key !== "all") return null;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`qp-notif-tab${activeTab === tab.key ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {count > 0 && (
                <span className={`qp-notif-tab__badge${tab.key === "unread" && count > 0 ? " is-unread" : ""}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Unread summary strip ── */}
      {unread > 0 && activeTab !== "unread" && (
        <div className="qp-notif-strip">
          <span className="qp-notif-strip__dot" aria-hidden />
          <span>{unread} thông báo chưa đọc</span>
        </div>
      )}

      {/* ── List or empty state ── */}
      {filtered.length === 0 ? (
        <div className="qp-notif-empty">
          <span className="qp-notif-empty__icon" aria-hidden>
            <IconSearch />
          </span>
          <p className="qp-notif-empty__msg">
            {query
              ? <>Không tìm thấy kết quả cho <strong>"{query}"</strong></>
              : "Không có thông báo nào trong mục này"}
          </p>
          {query && (
            <button type="button" className="qp-notif-empty__reset" onClick={() => setQuery("")}>
              Xóa tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <ul className="qp-notif-list">
          {filtered.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`qp-notif-item is-btn${n.read ? "" : " is-unread"}`}
                onClick={() => openItem(n)}
              >
                <span className={`qp-notif-item__icon is-${n.type}`}>
                  <TypeIcon type={n.type} />
                </span>
                <span className="qp-notif-item__text">
                  <span className="qp-notif-item__title">{n.title}</span>
                  <TimeAgo iso={n.createdAt} className="qp-notif-item__time" />
                </span>
                {!n.read && <span className="qp-notif-item__dot" aria-label="Chưa đọc" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
