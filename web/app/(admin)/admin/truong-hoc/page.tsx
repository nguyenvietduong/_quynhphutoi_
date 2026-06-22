import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listSchools, toSchoolRow } from "@/lib/schools";
import { listActiveCategoryOptions } from "@/lib/categories";
import { SchoolsManager } from "@/components/admin/SchoolsManager";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";
import { getModulePerm } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Trường học — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSchoolsPage() {
  const perm = await getModulePerm("truong-hoc");
  if (!perm || perm === "none") redirect("/admin/403");

  const [docs, pageSeo, levelOptions, typeOptions] = await Promise.all([
    listSchools({}),
    getPageSeoConfig(),
    listActiveCategoryOptions("truong-hoc"),
    listActiveCategoryOptions("loai-hinh-truong"),
  ]);
  const rows = docs.map(toSchoolRow);
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Nội dung</span>
        <h1 className="type-h1">Trường học</h1>
        <p className="qp-admin-head__desc">Quản lý danh bạ trường học trên địa bàn huyện — thêm, sửa, xoá và ẩn/hiện.</p>
      </div>
      <ModuleTabs pageKey="/truong-hoc" pageLabel="Trường học" listLabel="Danh sách trường học" seoInitial={pageSeo["/truong-hoc"] ?? {}}>
        <SchoolsManager initial={rows} levelOptions={levelOptions} typeOptions={typeOptions} perm={perm} />
      </ModuleTabs>
    </>
  );
}
