import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listHealth, toHealthRow } from "@/lib/health";
import { HealthManager } from "@/components/admin/HealthManager";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";
import { listActiveCategoryOptions } from "@/lib/categories";
import { getModulePerm } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Y tế — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHealthPage() {
  const perm = await getModulePerm("y-te");
  if (!perm || perm === "none") redirect("/admin/403");

  const [docs, pageSeo, typeOptions, ownershipOptions] = await Promise.all([
    listHealth({}), getPageSeoConfig(),
    listActiveCategoryOptions("y-te"), listActiveCategoryOptions("so-huu-y-te"),
  ]);
  const rows = docs.map(toHealthRow);
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Nội dung</span>
        <h1 className="type-h1">Y tế</h1>
        <p className="qp-admin-head__desc">Quản lý danh bạ cơ sở y tế trên địa bàn huyện — bệnh viện, trung tâm y tế, phòng khám, trạm y tế, nhà thuốc; thêm, sửa, xoá và ẩn/hiện.</p>
      </div>
      <ModuleTabs pageKey="/y-te" pageLabel="Y tế" listLabel="Danh sách cơ sở y tế" seoInitial={pageSeo["/y-te"] ?? {}}>
        <HealthManager initial={rows} typeOptions={typeOptions} ownershipOptions={ownershipOptions} perm={perm} />
      </ModuleTabs>
    </>
  );
}
