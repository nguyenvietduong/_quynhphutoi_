import type { Metadata } from "next";
import { listHealth, toHealthRow } from "@/lib/health";
import { HealthManager } from "@/components/admin/HealthManager";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";

export const metadata: Metadata = { title: "Y tế — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHealthPage() {
  const [docs, pageSeo] = await Promise.all([listHealth({}), getPageSeoConfig()]);
  const rows = docs.map(toHealthRow);
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Nội dung</span>
        <h1 className="type-h1">Y tế</h1>
        <p className="qp-admin-head__desc">Quản lý danh bạ cơ sở y tế trên địa bàn huyện — bệnh viện, trung tâm y tế, phòng khám, trạm y tế, nhà thuốc; thêm, sửa, xoá và ẩn/hiện.</p>
      </div>
      <ModuleTabs pageKey="/y-te" pageLabel="Y tế" listLabel="Danh sách cơ sở y tế" seoInitial={pageSeo["/y-te"] ?? {}}>
        <HealthManager initial={rows} />
      </ModuleTabs>
    </>
  );
}
