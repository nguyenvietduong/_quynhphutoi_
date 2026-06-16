"use client";

// Sidebar điều hướng khu quản trị. Nhóm theo chức năng; badge số tin chờ duyệt.
// Mobile: ẩn, mở bằng nút burger ở AdminTopbar (qua sự kiện custom).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type AdminCounts = { "viec-lam": number; "tim-do-roi": number; "mua-ban": number };

type Item = { href: string; label: string; icon: IconName; countKey?: keyof AdminCounts };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  { title: "Tổng quan", items: [{ href: "/admin", label: "Bảng điều khiển", icon: "home" }] },
  {
    title: "Kiểm duyệt",
    items: [
      { href: "/admin/viec-lam", label: "Việc làm", icon: "briefcase", countKey: "viec-lam" },
      { href: "/admin/tim-do-roi", label: "Tìm đồ rơi", icon: "search", countKey: "tim-do-roi" },
      { href: "/admin/mua-ban", label: "Mua bán", icon: "bag", countKey: "mua-ban" },
      { href: "/admin/loc-tu-ngu", label: "Lọc từ ngữ", icon: "shield" },
    ],
  },
  {
    title: "Nội dung",
    items: [
      { href: "/admin/tin-tuc", label: "Tin tức", icon: "news" },
      { href: "/admin/truong-hoc", label: "Trường học", icon: "cap" },
      { href: "/admin/y-te", label: "Y tế", icon: "health" },
      { href: "/admin/cho", label: "Chợ & Mua bán", icon: "store" },
      { href: "/admin/giao-thong", label: "Giao thông", icon: "bus" },
      { href: "/admin/di-tich", label: "Di tích", icon: "landmark" },
    ],
  },
  {
    title: "Danh mục & dữ liệu",
    items: [
      { href: "/admin/danh-muc", label: "Danh mục", icon: "folder" },
      { href: "/admin/don-vi-hanh-chinh", label: "Đơn vị hành chính", icon: "map" },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { href: "/admin/trang-chu", label: "Trang chủ", icon: "layout" },
      { href: "/admin/seo", label: "SEO từng trang", icon: "globe" },
      { href: "/admin/affiliate", label: "Affiliate Shopee", icon: "cart" },
      { href: "/admin/nguoi-dung", label: "Người dùng", icon: "users" },
      { href: "/admin/lien-he", label: "Liên hệ / Phản ánh", icon: "mail" },
      { href: "/admin/newsletter", label: "Đăng ký nhận tin", icon: "bell" },
      { href: "/admin/quang-cao", label: "Quảng cáo", icon: "megaphone" },
      { href: "/admin/thong-bao", label: "Gửi thông báo", icon: "bell" },
      { href: "/admin/cai-dat", label: "Cài đặt", icon: "gear" },
    ],
  },
];

export function AdminSidebar({ counts }: { counts: AdminCounts }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Đồng bộ với nút burger ở topbar qua sự kiện cửa sổ.
  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    window.addEventListener("qp-admin-menu", toggle);
    return () => window.removeEventListener("qp-admin-menu", toggle);
  }, []);
  // Đóng menu khi chuyển trang (mobile).
  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {open && <button className="qp-admin-backdrop" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
      <aside className={`qp-admin-sidebar${open ? " is-open" : ""}`}>
        <Link href="/admin" className="qp-admin-brand">
          <span className="qp-admin-brand__mark">QP</span>
          <span>
            <span className="qp-admin-brand__name">Quản trị</span><br />
            <span className="qp-admin-brand__sub">Cổng thông tin Quỳnh Phụ</span>
          </span>
        </Link>

        <nav className="qp-admin-nav" aria-label="Điều hướng quản trị">
          {GROUPS.map((g) => (
            <div className="qp-admin-nav__group" key={g.title}>
              <div className="qp-admin-nav__title">{g.title}</div>
              {g.items.map((it) => {
                const n = it.countKey ? counts[it.countKey] : 0;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`qp-admin-nav__link${isActive(it.href) ? " is-active" : ""}`}
                    aria-current={isActive(it.href) ? "page" : undefined}
                  >
                    <Icon name={it.icon} />
                    <span>{it.label}</span>
                    {n > 0 && <span className="qp-admin-nav__count">{n}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

type IconName =
  | "home" | "briefcase" | "search" | "bag" | "news" | "cap" | "health"
  | "store" | "bus" | "landmark" | "folder" | "map" | "users" | "megaphone" | "bell" | "mail" | "gear" | "layout" | "globe" | "cart" | "shield";

function Icon({ name }: { name: IconName }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  switch (name) {
    case "home": return <svg {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>;
    case "briefcase": return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
    case "search": return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
    case "bag": return <svg {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></svg>;
    case "news": return <svg {...p}><path d="M4 4h12v16H4z" /><path d="M16 8h4v10a2 2 0 0 1-2 2M8 8h4M8 12h4M8 16h4" /></svg>;
    case "cap": return <svg {...p}><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1 3 2 6 2s6-1 6-2v-5" /></svg>;
    case "health": return <svg {...p}><path d="M3.5 13H7l2-6 3 12 2.5-8 1.5 2h4" /></svg>;
    case "store": return <svg {...p}><path d="M3 9 4.5 4h15L21 9M4 9v11h16V9M4 9h16" /></svg>;
    case "bus": return <svg {...p}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M3 11h18M7 20v-3M17 20v-3" /><circle cx="7.5" cy="17.5" r=".5" /><circle cx="16.5" cy="17.5" r=".5" /></svg>;
    case "landmark": return <svg {...p}><path d="M3 21h18M4 10h16M12 3 4 7v3h16V7l-8-4ZM6 10v8M10 10v8M14 10v8M18 10v8" /></svg>;
    case "folder": return <svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>;
    case "map": return <svg {...p}><path d="m9 4 6 2 6-2v14l-6 2-6-2-6 2V6l6-2Z" /><path d="M9 4v14M15 6v14" /></svg>;
    case "users": return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a5 5 0 0 0-4-5" /></svg>;
    case "megaphone": return <svg {...p}><path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1Z" /><path d="M19 9a4 4 0 0 1 0 6" /></svg>;
    case "bell": return <svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;
    case "mail": return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
    case "layout": return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></svg>;
    case "globe": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>;
    case "cart": return <svg {...p}><circle cx="9" cy="21" r="1" /><circle cx="18" cy="21" r="1" /><path d="M1 1h4l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>;
    case "shield": return <svg {...p}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "gear": return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>;
  }
}
