import type { Metadata } from "next";
import Link from "next/link";
import { countPendingJobs, countJobs } from "@/lib/jobs";
import { countPending as countPendingLostFound, countPosts } from "@/lib/lostfound";
import { countPendingClassifieds, countClassifieds } from "@/lib/classifieds";
import { schools, countByLevel } from "@/lib/schools";
import { health, countByType as healthByType } from "@/lib/health";
import { market } from "@/lib/market";
import { transit } from "@/lib/transit";
import { relics } from "@/lib/relics";
import { articles, countArticles, listArticles } from "@/lib/articles";
import { adminUnits } from "@/lib/admin-units";
import { listActiveCategoryOptions } from "@/lib/categories";
import { dailyNewCounts, userStats } from "@/lib/stats";
import { BarList } from "@/components/admin/charts/BarList";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { ChartSwitcher, type SwitchOption } from "@/components/admin/charts/ChartSwitcher";

export const metadata: Metadata = { title: "Bảng điều khiển — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const C = {
  teal: "#00A98F", indigo: "#6366F1", navy: "#0F4C81", warn: "#F59E0B",
  tealLight: "#34D4B8", indigoLight: "#818CF8", rose: "#E1567C", slate: "#64748B",
};

/* ─── SVG Icons ─────────────────────────────────────────── */
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
const IconTrend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconInbox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconDatabase = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);
const IconBriefcase = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconTag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const IconNewspaper = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4-4V6" />
    <line x1="12" y1="8" x2="18" y2="8" /><line x1="12" y1="12" x2="18" y2="12" /><line x1="12" y1="16" x2="18" y2="16" />
  </svg>
);
const IconUserCog = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    <circle cx="19" cy="19" r="2" /><path d="M19 15v2" /><path d="M19 21v1" />
  </svg>
);
const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%" }}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

/* ─── Helper components ──────────────────────────────────── */
function StatCard({
  icon, value, label, sub, color = C.teal, warn = false,
}: {
  icon: React.ReactNode; value: number; label: string; sub?: string; color?: string; warn?: boolean;
}) {
  const accent = warn ? C.warn : color;
  return (
    <div
      className={`qp-acc-stat${warn ? " is-warn" : ""}`}
      style={{ textAlign: "left", padding: "20px 22px", borderTop: `3px solid ${accent}` }}
    >
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 40, height: 40, borderRadius: 10,
        background: `${accent}18`, marginBottom: 14,
        flexShrink: 0,
      }}>
        <div style={{ color: accent, width: 20, height: 20 }}>{icon}</div>
      </div>
      <div className="qp-acc-stat__value" style={{ fontSize: 30, textAlign: "left", lineHeight: 1 }}>
        {value.toLocaleString("vi-VN")}
      </div>
      <div className="qp-acc-stat__label" style={{ textAlign: "left", marginTop: 6 }}>{label}</div>
      {sub && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-gray-text)", lineHeight: 1.5, borderTop: "1px solid var(--color-gray-border)", paddingTop: 8 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  href, icon, label, badge, ok, desc, count,
}: {
  href: string; icon: React.ReactNode; label: string;
  badge: string; ok: boolean; desc?: string; count?: number;
}) {
  return (
    <Link href={href} className="qp-admin-card" style={{ gap: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 46, height: 46, borderRadius: 12,
          background: ok ? "var(--color-teal-pale)" : "rgba(245,158,11,0.10)",
          flexShrink: 0,
        }}>
          <div style={{ color: ok ? "var(--color-teal-dark)" : C.warn, width: 22, height: 22 }}>{icon}</div>
        </div>
        <span className={`qp-admin-card__badge${ok ? " is-ok" : ""}`}>{badge}</span>
      </div>
      <div className="qp-admin-card__label">{label}</div>
      {desc && <p className="qp-admin-card__desc" style={{ marginTop: 4 }}>{desc}</p>}
      {count !== undefined && (
        <p className="qp-admin-card__desc" style={{ marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
          <b style={{ color: "var(--color-navy)", fontSize: 15 }}>{count.toLocaleString("vi-VN")}</b> mục trong hệ thống
        </p>
      )}
      <span className="qp-admin-card__go" style={{ marginTop: 16 }}>Mở trang →</span>
    </Link>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default async function AdminHomePage() {
  const [
    pJobs, pLost, pClass, tJobs, tLost, tClass,
    nSchools, nHealth, nMarket, nTransit, nRelics, nArticles, nUnits,
    artPublished, artDraft, topArticles, byLevel, byHealth, users, daily,
    schoolLevels, healthTypes,
  ] = await Promise.all([
    countPendingJobs(), countPendingLostFound(), countPendingClassifieds(),
    countJobs({ approvedOnly: false }), countPosts({ approvedOnly: false }), countClassifieds({ approvedOnly: false }),
    schools().then((c) => c.countDocuments({})),
    health().then((c) => c.countDocuments({})),
    market().then((c) => c.countDocuments({})),
    transit().then((c) => c.countDocuments({})),
    relics().then((c) => c.countDocuments({})),
    articles().then((c) => c.countDocuments({})),
    adminUnits().then((c) => c.countDocuments({})),
    countArticles({ status: "published" }),
    countArticles({ status: "draft" }),
    listArticles({ status: "published", sort: "popular", limit: 6 }),
    countByLevel(),
    healthByType(),
    userStats(),
    dailyNewCounts(14),
    listActiveCategoryOptions("truong-hoc"),
    listActiveCategoryOptions("y-te"),
  ]);

  const totalPending = pJobs + pLost + pClass;
  const totalPosts = tJobs + tLost + tClass;
  const totalApproved = totalPosts - totalPending;
  const totalDataEntries = nSchools + nHealth + nMarket + nTransit + nRelics + nUnits;
  const sum = (k: "jobs" | "lostfound" | "classifieds" | "articles") => daily.reduce((s, d) => s + d[k], 0);
  const totalNew14 = sum("jobs") + sum("lostfound") + sum("classifieds") + sum("articles");

  const barOptions: SwitchOption[] = [
    { key: "posts", label: "Tin theo phân hệ", type: "bar", unit: " tin", items: [
      { label: "Việc làm", value: tJobs, color: C.teal },
      { label: "Tìm đồ rơi", value: tLost, color: C.indigo },
      { label: "Mua bán", value: tClass, color: C.warn },
    ] },
    { key: "content", label: "Nội dung & danh bạ", type: "bar", items: [
      { label: "Bài viết", value: nArticles, color: C.navy },
      { label: "Trường học", value: nSchools, color: C.teal },
      { label: "Y tế", value: nHealth, color: C.rose },
      { label: "Di tích", value: nRelics, color: C.indigo },
      { label: "Chợ & mua bán", value: nMarket, color: C.warn },
      { label: "Giao thông", value: nTransit, color: C.slate },
      { label: "Đơn vị HC", value: nUnits, color: C.indigoLight },
    ] },
    { key: "schools", label: "Trường học theo cấp", type: "bar", unit: " trường",
      items: schoolLevels.map((l) => ({ label: l.name, value: byLevel[l.slug] ?? 0, color: C.teal })) },
    { key: "health", label: "Cơ sở y tế theo loại", type: "bar",
      items: healthTypes.map((t) => ({ label: t.name, value: byHealth[t.slug] ?? 0, color: C.rose })) },
  ];

  const donutOptions: SwitchOption[] = [
    { key: "moderation", label: "Tình trạng kiểm duyệt", type: "donut", center: "Tổng tin", items: [
      { label: "Đã duyệt", value: Math.max(0, totalApproved), color: C.teal },
      { label: "Chờ duyệt", value: totalPending, color: C.warn },
    ] },
    { key: "new", label: "Tin mới 14 ngày theo phân hệ", type: "donut", center: "Tin mới", items: [
      { label: "Việc làm", value: sum("jobs"), color: C.teal },
      { label: "Tìm đồ rơi", value: sum("lostfound"), color: C.indigo },
      { label: "Mua bán", value: sum("classifieds"), color: C.warn },
      { label: "Bài viết", value: sum("articles"), color: C.navy },
    ] },
    { key: "users", label: "Người dùng", type: "donut", center: "Tài khoản", items: [
      { label: "Quản trị (admin)", value: users.admins, color: C.indigo },
      { label: "Người dùng", value: Math.max(0, users.total - users.admins), color: C.teal },
    ] },
  ];

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Tổng quan</span>
        <h1 className="type-h1">Bảng điều khiển</h1>
      </div>

      {/* ── Pending alert ──────────────────────────────────── */}
      {totalPending > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "14px 20px",
          background: "rgba(245,158,11,0.07)",
          border: "1px solid rgba(245,158,11,0.35)",
          borderLeft: `4px solid ${C.warn}`,
          borderRadius: "var(--radius-card)",
          marginBottom: "var(--space-5)",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={C.warn} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <span style={{ fontWeight: 700, color: "var(--color-navy-deep)", fontSize: 14 }}>
                Có {totalPending} tin đang chờ duyệt
              </span>
              <span style={{ fontSize: 13, color: "var(--color-gray-text)", marginLeft: 10 }}>
                {[
                  pJobs  > 0 && `${pJobs} việc làm`,
                  pLost  > 0 && `${pLost} tìm đồ rơi`,
                  pClass > 0 && `${pClass} mua bán`,
                ].filter(Boolean).join(" · ")}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            {pJobs  > 0 && <Link href="/admin/viec-lam"   style={{ fontSize: 13, fontWeight: 600, color: C.warn, textDecoration: "none", padding: "5px 12px", border: `1px solid ${C.warn}`, borderRadius: 6, background: "rgba(245,158,11,0.08)" }}>Việc làm →</Link>}
            {pLost  > 0 && <Link href="/admin/tim-do-roi" style={{ fontSize: 13, fontWeight: 600, color: C.warn, textDecoration: "none", padding: "5px 12px", border: `1px solid ${C.warn}`, borderRadius: 6, background: "rgba(245,158,11,0.08)" }}>Đồ rơi →</Link>}
            {pClass > 0 && <Link href="/admin/mua-ban"    style={{ fontSize: 13, fontWeight: 600, color: C.warn, textDecoration: "none", padding: "5px 12px", border: `1px solid ${C.warn}`, borderRadius: 6, background: "rgba(245,158,11,0.08)" }}>Mua bán →</Link>}
          </div>
        </div>
      )}

      {/* ── KPI Stats — 3 cột × 2 hàng ────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0,1fr))",
        gap: 14,
        marginBottom: "var(--space-6)",
      }}>
        <StatCard
          icon={<IconUsers />}
          value={users.total}
          label="Người dùng"
          color={C.navy}
          sub={`${users.admins} quản trị · ${Math.max(0, users.total - users.admins)} thành viên`}
        />
        <StatCard
          icon={<IconFile />}
          value={artPublished}
          label="Bài đã xuất bản"
          color={C.indigo}
          sub={`${artDraft} bài nháp · ${nArticles} tổng bài viết`}
        />
        <StatCard
          icon={<IconTrend />}
          value={totalNew14}
          label="Tin mới 14 ngày"
          color={C.teal}
          sub={`${sum("jobs")} VL · ${sum("lostfound")} ĐR · ${sum("classifieds")} MB · ${sum("articles")} bài`}
        />
        <StatCard
          icon={<IconInbox />}
          value={totalPosts}
          label="Tổng tin đăng"
          color={C.slate}
          sub={`${tJobs} việc làm · ${tLost} tìm đồ rơi · ${tClass} mua bán`}
        />
        <StatCard
          icon={<IconClock />}
          value={totalPending}
          label="Chờ duyệt"
          warn={totalPending > 0}
          sub={totalPending > 0
            ? [pJobs > 0 && `${pJobs} việc làm`, pLost > 0 && `${pLost} đồ rơi`, pClass > 0 && `${pClass} mua bán`].filter(Boolean).join(" · ")
            : "Không có tin nào cần duyệt"}
        />
        <StatCard
          icon={<IconDatabase />}
          value={totalDataEntries}
          label="Dữ liệu hệ thống"
          color={C.teal}
          sub={`${nSchools} trường · ${nHealth} y tế · ${nRelics} di tích · ${nMarket} chợ · ${nTransit} GT · ${nUnits} đơn vị HC`}
        />
      </div>

      {/* ── Charts grid — 3 cột ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "var(--space-5)", marginBottom: "var(--space-6)" }}>

        {/* Xu hướng — span toàn bộ */}
        <div className="qp-chart-card" style={{ gridColumn: "1 / -1" }}>
          <div className="qp-chart-card__head">
            <span className="qp-chart-card__title">Xu hướng đăng tin · bài (14 ngày)</span>
            <span className="qp-chart-card__hint">Tổng: {daily.reduce((s, d) => s + d.total, 0).toLocaleString("vi-VN")} tin · bài</span>
          </div>
          <TrendChart points={daily.map((d) => ({ date: d.date, total: d.total }))} />
        </div>

        {/* Bar — 2 cột (rộng hơn để label không bị cắt) */}
        <div style={{ gridColumn: "span 2" }}>
          <ChartSwitcher title="Phân bố số lượng" options={barOptions} />
        </div>

        {/* Donut — 1 cột */}
        <ChartSwitcher title="Tỉ lệ" options={donutOptions} />

        {/* Top bài viết — span toàn bộ */}
        <div className="qp-chart-card" style={{ gridColumn: "1 / -1" }}>
          <div className="qp-chart-card__head">
            <span className="qp-chart-card__title">Bài viết xem nhiều nhất</span>
            <span className="qp-chart-card__hint">{artPublished} đã xuất bản · {artDraft} nháp</span>
          </div>
          {topArticles.length === 0
            ? <p className="type-body-small text-muted">Chưa có bài viết nào.</p>
            : <BarList items={topArticles.map((a) => ({ label: a.title, value: a.views ?? 0, color: C.navy }))} unit=" lượt" />}
        </div>
      </div>

      {/* ── Module shortcuts ───────────────────────────────── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: "var(--space-4)", paddingBottom: "var(--space-3)", borderBottom: "1px solid var(--color-gray-border)" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--color-gray-text)", marginBottom: 4 }}>Lối tắt</p>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--color-navy-deep)" }}>Truy cập nhanh</h2>
          </div>
        </div>
      </div>

      <div className="qp-admin-grid">
        <ModuleCard
          href="/admin/viec-lam"
          icon={<IconBriefcase />}
          label="Việc làm"
          badge={pJobs ? `${pJobs} chờ duyệt` : "Xong rồi"}
          ok={!pJobs}
          count={tJobs}
        />
        <ModuleCard
          href="/admin/tim-do-roi"
          icon={<IconSearch />}
          label="Tìm đồ rơi"
          badge={pLost ? `${pLost} chờ duyệt` : "Xong rồi"}
          ok={!pLost}
          count={tLost}
        />
        <ModuleCard
          href="/admin/mua-ban"
          icon={<IconTag />}
          label="Mua bán"
          badge={pClass ? `${pClass} chờ duyệt` : "Xong rồi"}
          ok={!pClass}
          count={tClass}
        />
        <ModuleCard
          href="/admin/tin-tuc"
          icon={<IconNewspaper />}
          label="Tin tức"
          badge="Soạn bài"
          ok
          count={nArticles}
        />
        <ModuleCard
          href="/admin/nguoi-dung"
          icon={<IconUserCog />}
          label="Người dùng"
          badge="Quản lý"
          ok
          count={users.total}
        />
        <ModuleCard
          href="/admin/thong-bao"
          icon={<IconBell />}
          label="Thông báo"
          badge="Broadcast"
          ok
          desc="Gửi thông báo tới người dùng hoặc ban quản trị"
        />
      </div>
    </>
  );
}
