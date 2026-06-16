import type { Metadata } from "next";
import { listSchools, toSchoolRow } from "@/lib/schools";
import { SchoolsManager } from "@/components/admin/SchoolsManager";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";

export const metadata: Metadata = { title: "Trường học — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSchoolsPage() {
  const [docs, pageSeo] = await Promise.all([listSchools({}), getPageSeoConfig()]);
  const rows = docs.map(toSchoolRow);
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Nội dung</span>
        <h1 className="type-h1">Trường học</h1>
        <p className="qp-admin-head__desc">Quản lý danh bạ trường học trên địa bàn huyện — thêm, sửa, xoá và ẩn/hiện.</p>
      </div>
      <ModuleTabs pageKey="/truong-hoc" pageLabel="Trường học" listLabel="Danh sách trường học" seoInitial={pageSeo["/truong-hoc"] ?? {}}>
        <SchoolsManager initial={rows} />
      </ModuleTabs>
    </>
  );
}
