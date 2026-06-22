"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ResultItem = {
  id:    string;
  title: string;
  sub?:  string;
  href:  string;
};

type SearchResults = {
  articles?:    ResultItem[];
  users?:       ResultItem[];
  jobs?:        ResultItem[];
  classifieds?: ResultItem[];
  lostfound?:   ResultItem[];
};

const MODULES: { key: keyof SearchResults; label: string; icon: string }[] = [
  { key: "articles",    label: "Tin tức",    icon: "📰" },
  { key: "users",       label: "Người dùng", icon: "👤" },
  { key: "jobs",        label: "Việc làm",   icon: "💼" },
  { key: "classifieds", label: "Rao vặt",    icon: "🛍️" },
  { key: "lostfound",   label: "Tìm đồ",    icon: "🔍" },
];

export function AdminSearch() {
  const [open, setOpen]       = useState(false);
  const [q, setQ]             = useState("");
  const [results, setResults] = useState<SearchResults>({});
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Mở bằng Ctrl+K / Cmd+K
  useEffect(() => {
    function h(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQ(""); setResults({}); }
  }, [open]);

  // Click ngoài → đóng
  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function handleInput(val: string) {
    setQ(val);
    clearTimeout(timer.current);
    if (val.trim().length < 2) { setResults({}); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(val.trim())}`);
        const d = await res.json();
        setResults(d.results ?? {});
      } catch { setResults({}); }
      finally { setLoading(false); }
    }, 300);
  }

  const totalHits = MODULES.reduce((n, m) => n + (results[m.key]?.length ?? 0), 0);

  return (
    <>
      {/* Nút search trên topbar */}
      <button
        type="button"
        className="qp-admin-search-btn"
        onClick={() => setOpen(true)}
        aria-label="Tìm kiếm (Ctrl+K)"
        title="Tìm kiếm (Ctrl+K)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <span className="qp-admin-search-btn__label">Tìm kiếm…</span>
        <kbd className="qp-admin-search-btn__kbd">Ctrl K</kbd>
      </button>

      {/* Modal tìm kiếm */}
      {open && (
        <div className="qp-admin-search-overlay" role="dialog" aria-label="Tìm kiếm toàn cục">
          <div className="qp-admin-search-modal" ref={panelRef}>
            <div className="qp-admin-search-bar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden style={{ flexShrink: 0, opacity: .45 }}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                className="qp-admin-search-input"
                placeholder="Tìm bài viết, người dùng, việc làm…"
                value={q}
                onChange={e => handleInput(e.target.value)}
                autoComplete="off"
              />
              {loading && <span className="qp-admin-search-spin" aria-hidden />}
              <button type="button" className="qp-admin-search-esc" onClick={() => setOpen(false)}>ESC</button>
            </div>

            <div className="qp-admin-search-body">
              {q.trim().length < 2 ? (
                <div className="qp-admin-search-hint">
                  Nhập ít nhất 2 ký tự để tìm kiếm trên tất cả module
                </div>
              ) : totalHits === 0 && !loading ? (
                <div className="qp-admin-search-hint">Không tìm thấy kết quả cho "<b>{q}</b>"</div>
              ) : (
                MODULES.map(m => {
                  const list = results[m.key] ?? [];
                  if (list.length === 0) return null;
                  return (
                    <div key={m.key} className="qp-admin-search-group">
                      <div className="qp-admin-search-group__label">
                        <span>{m.icon}</span> {m.label}
                      </div>
                      {list.map(item => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="qp-admin-search-item"
                          onClick={() => setOpen(false)}
                          title={item.href}
                        >
                          <span className="qp-admin-search-item__body">
                            <span className="qp-admin-search-item__title">{item.title}</span>
                            {item.sub && (
                              <span className="qp-admin-search-item__sub">{item.sub}</span>
                            )}
                          </span>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden style={{ flexShrink: 0, opacity: .4 }}>
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
