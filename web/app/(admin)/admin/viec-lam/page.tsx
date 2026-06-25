import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listJobs, formatSalary, formatAge } from "@/lib/jobs";
import { getAdminUnitsMap } from "@/lib/admin-units";
import { PostModerationManager, type ModRow, type ModConfig } from "@/components/admin/PostModerationManager";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";
import { formatDate } from "@/lib/datetime";
import { getModulePerm } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Quản lý việc làm — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const config: ModConfig = {
  apiBase: "/api/admin/jobs", publicBase: "/viec-lam", extraKey: "company", extraLabel: "Công ty",
  subfolder: "viec-lam",
  statusOptions: [
    { value: "open", label: "Đang tuyển" }, { value: "closed", label: "Đã đóng" }, { value: "filled", label: "Đã tuyển xong" },
  ],
};

const spec = (label: string, value?: string | number | null) =>
  value || value === 0 ? [{ label, value: String(value) }] : [];

export default async function AdminJobsPage() {
  const perm = await getModulePerm("viec-lam");
  if (!perm || perm === "none") redirect("/admin/403");

  const [docs, units, pageSeo] = await Promise.all([listJobs({ approvedOnly: false, limit: 500 }), getAdminUnitsMap(), getPageSeoConfig()]);
  const rows: ModRow[] = docs.map((d) => {
    const ward = units.get(d.location.wardSlug)?.name ?? d.location.wardSlug;
    const place = [d.location.address, ward].filter(Boolean).join(", ");
    return {
      slug: d.slug, title: d.title, sub: `${d.company} · ${d.industryLabel} · ${formatSalary(d.salary)}`,
      description: d.description, extra: d.company, status: d.status, approved: d.approved, featured: d.featured,
      postedByName: d.postedByName, createdAt: d.createdAt.toISOString(),
      approvedByName: d.approvedByName ?? undefined, approvedAt: d.approvedAt ? (d.approvedAt as Date).toISOString() : null,
      images: d.images ?? [], thumb: d.images?.[0],
      address: d.location.address ?? "", mapUrl: d.location.mapUrl ?? "",
      seo: d.seo,
      specs: [
        ...spec("Công ty", d.company),
        ...spec("Ngành", d.industryLabel),
        ...spec("Hình thức", d.jobTypeLabel),
        ...spec("Mức lương", formatSalary(d.salary)),
        ...spec("Độ tuổi", formatAge(d.age) || undefined),
        ...spec("Số lượng", d.quantity ?? undefined),
        ...spec("Kinh nghiệm", d.experience),
        ...spec("Trình độ", d.education),
        ...spec("Địa điểm", place),
        ...spec("Hạn nộp", d.deadline ? formatDate(d.deadline) : undefined),
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
        <h1 className="type-h1">Quản lý việc làm</h1>
        <p className="qp-admin-head__desc">Duyệt, xem chi tiết, sửa, ẩn/hiện và xoá tin tuyển dụng do người dân đăng.</p>
      </div>
      <ModuleTabs pageKey="/viec-lam" pageLabel="Việc làm" listLabel="Danh sách việc làm" seoInitial={pageSeo["/viec-lam"] ?? {}}>
        <PostModerationManager initial={rows} config={config} perm={perm} />
      </ModuleTabs>
    </>
  );
}
