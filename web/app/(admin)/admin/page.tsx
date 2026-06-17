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

  // Tổng tin mới 14 ngày theo phân hệ.
  const sum = (k: "jobs" | "lostfound" | "classifieds" | "articles") => daily.reduce((s, d) => s + d[k], 0);

  // Các bộ số liệu cho dropdown (gọn thay vì bày hết).
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
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Tổng quan</span>
        <h1 className="type-h1">Bảng điều khiển</h1>
        <p className="qp-admin-head__desc">
          {totalPending > 0 ? <>Có <b>{totalPending}</b> tin đang chờ duyệt. </> : "Không có tin chờ duyệt. "}
          Tổng quan số liệu &amp; xu hướng hoạt động của cổng.
        </p>
      </div>

      {/* KPI */}
      <div className="qp-acc-stats" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginBottom: "var(--space-6)" }}>
        <div className="qp-acc-stat"><div className="qp-acc-stat__value">{users.total.toLocaleString("vi-VN")}</div><div className="qp-acc-stat__label">Người dùng</div></div>
        <div className="qp-acc-stat"><div className="qp-acc-stat__value">{artPublished.toLocaleString("vi-VN")}</div><div className="qp-acc-stat__label">Bài đã xuất bản</div></div>
        <div className="qp-acc-stat"><div className="qp-acc-stat__value">{totalPosts.toLocaleString("vi-VN")}</div><div className="qp-acc-stat__label">Tổng tin đăng</div></div>
        <div className={`qp-acc-stat${totalPending ? " is-warn" : ""}`}><div className="qp-acc-stat__value">{totalPending.toLocaleString("vi-VN")}</div><div className="qp-acc-stat__label">Chờ duyệt</div></div>
      </div>

      <div className="qp-dash-grid">
        {/* Xu hướng — luôn hiển thị */}
        <div className="qp-chart-card span-2">
          <div className="qp-chart-card__head">
            <span className="qp-chart-card__title">Xu hướng đăng tin · bài (14 ngày)</span>
            <span className="qp-chart-card__hint">Tổng: {daily.reduce((s, d) => s + d.total, 0)}</span>
          </div>
          <TrendChart points={daily.map((d) => ({ date: d.date, total: d.total }))} />
        </div>

        {/* Phân bố số lượng — chọn loại bằng dropdown */}
        <ChartSwitcher title="Phân bố số lượng" options={barOptions} />

        {/* Tỉ lệ — chọn loại bằng dropdown */}
        <ChartSwitcher title="Tỉ lệ" options={donutOptions} />

        {/* Top bài viết — luôn hiển thị */}
        <div className="qp-chart-card span-2">
          <div className="qp-chart-card__head">
            <span className="qp-chart-card__title">Bài viết xem nhiều nhất</span>
            <span className="qp-chart-card__hint">{artPublished} đã xuất bản · {artDraft} nháp</span>
          </div>
          {topArticles.length === 0
            ? <p className="type-body-small text-muted">Chưa có bài viết nào.</p>
            : <BarList items={topArticles.map((a) => ({ label: a.title, value: a.views ?? 0, color: C.navy }))} unit=" lượt" />}
        </div>
      </div>

      {/* Truy cập nhanh */}
      <div className="qp-newsgrid-head"><span className="type-tag qp-sechead__eyebrow">Lối tắt</span><h2 className="type-h2">Truy cập nhanh</h2></div>
      <div className="qp-admin-grid">
        <QuickCard href="/admin/viec-lam" label="Duyệt việc làm" badge={pJobs ? `${pJobs} chờ` : "Xong"} ok={!pJobs} />
        <QuickCard href="/admin/tim-do-roi" label="Duyệt tìm đồ rơi" badge={pLost ? `${pLost} chờ` : "Xong"} ok={!pLost} />
        <QuickCard href="/admin/mua-ban" label="Duyệt mua bán" badge={pClass ? `${pClass} chờ` : "Xong"} ok={!pClass} />
        <QuickCard href="/admin/tin-tuc" label="Viết tin tức" badge="Soạn bài" ok />
        <QuickCard href="/admin/nguoi-dung" label="Người dùng" badge="Quản lý" ok />
        <QuickCard href="/admin/thong-bao" label="Gửi thông báo" badge="Broadcast" ok />
      </div>
    </>
  );
}

function QuickCard({ href, label, badge, ok }: { href: string; label: string; badge: string; ok: boolean }) {
  return (
    <Link href={href} className="qp-admin-card">
      <div className="qp-admin-card__top">
        <span className="qp-admin-card__label">{label}</span>
        <span className={`qp-admin-card__badge${ok ? " is-ok" : ""}`}>{badge}</span>
      </div>
      <span className="qp-admin-card__go">Mở trang →</span>
    </Link>
  );
}
