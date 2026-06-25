import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listPosts } from "@/lib/lostfound";
import { getAdminUnitsMap } from "@/lib/admin-units";
import { PostModerationManager, type ModRow, type ModConfig } from "@/components/admin/PostModerationManager";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";
import { formatDate } from "@/lib/datetime";
import { getModulePerm } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Quản lý tìm đồ rơi — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const config: ModConfig = {
  apiBase: "/api/admin/lost-found", publicBase: "/tim-do-roi", extraKey: "reward", extraLabel: "Hậu tạ",
  subfolder: "tim-do-roi",
  statusOptions: [
    { value: "open", label: "Đang mở" }, { value: "matched", label: "Đã có manh mối" },
    { value: "resolved", label: "Đã giải quyết" }, { value: "closed", label: "Đã đóng" },
  ],
};

const spec = (label: string, value?: string | number | null) =>
  value || value === 0 ? [{ label, value: String(value) }] : [];

export default async function AdminLostFoundPage() {
  const perm = await getModulePerm("tim-do-roi");
  if (!perm || perm === "none") redirect("/admin/403");

  const [docs, units, pageSeo] = await Promise.all([listPosts({ approvedOnly: false, limit: 500 }), getAdminUnitsMap(), getPageSeoConfig()]);
  const rows: ModRow[] = docs.map((d) => {
    const ward = units.get(d.location.wardSlug)?.name ?? d.location.wardSlug;
    const place = [d.location.address, ward].filter(Boolean).join(", ");
    return {
      slug: d.slug, title: d.title, sub: `${d.kind === "tim-do" ? "Tìm đồ" : "Nhặt được"} · ${d.categoryName}`,
      description: d.description, extra: d.reward ?? "", status: d.status, approved: d.approved, featured: d.featured,
      postedByName: d.postedByName, createdAt: d.createdAt.toISOString(),
      approvedByName: d.approvedByName ?? undefined, approvedAt: d.approvedAt ? (d.approvedAt as Date).toISOString() : null,
      images: d.images ?? [], thumb: d.images?.[0],
      address: d.location.address ?? "", mapUrl: d.location.mapUrl ?? "",
      seo: d.seo,
      specs: [
        ...spec("Loại tin", d.kind === "tim-do" ? "Tìm đồ thất lạc" : "Nhặt được đồ"),
        ...spec("Danh mục", d.categoryName),
        ...spec("Địa điểm", place),
        ...spec("Thời điểm", d.occurredAt ? formatDate(d.occurredAt) : undefined),
        ...spec("Hậu tạ", d.reward),
        ...spec("Người liên hệ", d.contact?.name),
        ...spec("Điện thoại", d.contact?.phone),
        ...spec("Email", d.contact?.email),
      ],
    };
  });
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Kiểm duyệt</span>
        <h1 className="type-h1">Quản lý tìm đồ rơi</h1>
        <p className="qp-admin-head__desc">Duyệt, xem chi tiết, sửa, ẩn/hiện và xoá tin tìm đồ / nhặt được đồ.</p>
      </div>
      <ModuleTabs pageKey="/tim-do-roi" pageLabel="Tìm đồ rơi" listLabel="Danh sách tìm đồ rơi" seoInitial={pageSeo["/tim-do-roi"] ?? {}}>
        <PostModerationManager initial={rows} config={config} perm={perm} />
      </ModuleTabs>
    </>
  );
}
