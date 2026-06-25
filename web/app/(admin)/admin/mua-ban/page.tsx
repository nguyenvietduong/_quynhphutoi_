import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listClassifieds } from "@/lib/classifieds";
import { getAdminUnitsMap } from "@/lib/admin-units";
import { categoryLabelMap } from "@/lib/categories";
import { PostModerationManager, type ModRow, type ModConfig } from "@/components/admin/PostModerationManager";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";
import { getModulePerm } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Quản lý mua bán — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const config: ModConfig = {
  apiBase: "/api/admin/mua-ban", publicBase: "/mua-ban", extraKey: "priceText", extraLabel: "Giá",
  subfolder: "mua-ban",
  statusOptions: [
    { value: "open", label: "Đang bán" }, { value: "sold", label: "Đã bán" }, { value: "closed", label: "Đã đóng" },
  ],
};

const spec = (label: string, value?: string | number | null) =>
  value || value === 0 ? [{ label, value: String(value) }] : [];

export default async function AdminClassifiedsPage() {
  const perm = await getModulePerm("mua-ban");
  if (!perm || perm === "none") redirect("/admin/403");

  const [docs, units, pageSeo, condMap] = await Promise.all([listClassifieds({ approvedOnly: false, limit: 500 }), getAdminUnitsMap(), getPageSeoConfig(), categoryLabelMap("tinh-trang")]);
  const rows: ModRow[] = docs.map((d) => {
    const ward = units.get(d.location.wardSlug)?.name ?? d.location.wardSlug;
    const place = [d.location.address, ward].filter(Boolean).join(", ");
    return {
      slug: d.slug, title: d.title, sub: `${d.categoryLabel} · ${d.priceText}`,
      description: d.description, extra: d.priceText, status: d.status, approved: d.approved, featured: d.featured,
      postedByName: d.postedByName, createdAt: d.createdAt.toISOString(),
      approvedByName: d.approvedByName ?? undefined, approvedAt: d.approvedAt ? (d.approvedAt as Date).toISOString() : null,
      images: d.images ?? [], thumb: d.images?.[0],
      address: d.location.address ?? "", mapUrl: d.location.mapUrl ?? "",
      seo: d.seo,
      specs: [
        ...spec("Danh mục", d.categoryLabel),
        ...spec("Giá", d.priceText),
        ...spec("Tình trạng", d.condition ? (condMap[d.condition] ?? d.condition) : undefined),
        ...spec("Địa điểm", place),
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
        <h1 className="type-h1">Quản lý mua bán</h1>
        <p className="qp-admin-head__desc">Duyệt, xem chi tiết, sửa, ẩn/hiện và xoá tin rao vặt mua bán do người dân đăng.</p>
      </div>
      <ModuleTabs pageKey="/mua-ban" pageLabel="Mua bán" listLabel="Danh sách mua bán" seoInitial={pageSeo["/mua-ban"] ?? {}}>
        <PostModerationManager initial={rows} config={config} perm={perm} />
      </ModuleTabs>
    </>
  );
}
