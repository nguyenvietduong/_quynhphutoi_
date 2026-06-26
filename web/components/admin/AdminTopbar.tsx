"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TickerItem } from "@/lib/staff-ticker";
import { AdminNotifBell } from "@/components/admin/AdminNotifBell";
import { AdminSearch } from "@/components/admin/AdminSearch";

type Props = { name: string; email: string; avatar?: string | null };

export function AdminTopbar({ name, email, avatar }: Props) {
  const [busy, setBusy]       = useState(false);
  const [items, setItems]     = useState<TickerItem[]>([]);
  const [menuOpen, setMenu]   = useState(false);
  const textRef  = useRef<HTMLSpanElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/staff-ticker")
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!textRef.current) return;
    const w = textRef.current.scrollWidth;
    const dur = Math.max(15, Math.round(w / 40));
    textRef.current.style.setProperty("--ticker-dur", `${dur}s`);
  }, [items]);

  // Click ngoài → đóng menu
  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/");
  }

  const initials = name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const WELCOME = "Chào mừng đến với khu vực quản trị";
  const dbParts = items.map((it) => `${it.actorName}: ${it.text}`);
  const tickerContent = [WELCOME, ...dbParts].join("   ◆   ");

  return (
    <header className="qp-admin-topbar">

      {/* Trái: burger + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button
          type="button"
          className="qp-admin-burger"
          aria-label="Mở menu quản trị"
          onClick={() => window.dispatchEvent(new Event("qp-admin-menu"))}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="qp-admin-topbar__title">Khu vực quản trị</span>
      </div>

      {/* Giữa: ticker — luôn hiển thị, "Chào mừng" hardcode, phần còn lại từ DB */}
      <div className="qp-admin-ticker" title="Di chuột để dừng">
        <span className="qp-admin-ticker__icon" aria-hidden>📢</span>
        <div className="qp-admin-ticker__track">
          <span ref={textRef} className="qp-admin-ticker__text">{tickerContent}</span>
        </div>
      </div>

      {/* Phải: search + bell + user dropdown */}
      <AdminSearch />
      <AdminNotifBell />
      <div className="qp-admin-user" ref={menuRef}>
        <button
          type="button"
          className={`qp-admin-user__btn${menuOpen ? " is-open" : ""}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenu((v) => !v)}
        >
          <span className="qp-admin-user__avatar">
            {avatar
              ? <img src={avatar} alt="" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover", width: 32, height: 32 }} />
              : initials}
          </span>
          <span className="qp-admin-user__name">{name}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transition: "transform .2s", transform: menuOpen ? "rotate(180deg)" : "none" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {menuOpen && (
          <div className="qp-admin-user__menu" role="menu">
            {/* Header */}
            <div className="qp-admin-user__head">
              <span className="qp-admin-user__avatar is-lg">
                {avatar
                  ? <img src={avatar} alt="" width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover", width: 40, height: 40 }} />
                  : initials}
              </span>
              <span className="qp-admin-user__info">
                <span className="qp-admin-user__info-name">{name}</span>
                <span className="qp-admin-user__info-email">{email}</span>
              </span>
            </div>

            <div className="qp-admin-user__sep" />

            <Link
              href="/tai-khoan"
              className="qp-admin-user__item"
              role="menuitem"
              onClick={() => setMenu(false)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              Thông tin tài khoản
            </Link>

            <Link
              href="/"
              className="qp-admin-user__item"
              role="menuitem"
              onClick={() => setMenu(false)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M3 12v9h18v-9" />
              </svg>
              Về trang chủ
            </Link>

            <div className="qp-admin-user__sep" />

            <button
              type="button"
              className="qp-admin-user__item is-danger"
              role="menuitem"
              disabled={busy}
              onClick={logout}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {busy ? "Đang đăng xuất…" : "Đăng xuất"}
            </button>
          </div>
        )}
      </div>

    </header>
  );
}
