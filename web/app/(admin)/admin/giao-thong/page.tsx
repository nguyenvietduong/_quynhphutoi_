import type { Metadata } from "next";
import { listTransit, toTransitRow } from "@/lib/transit";
import { TransitManager } from "@/components/admin/TransitManager";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";
import { listActiveCategoryOptions } from "@/lib/categories";

export const metadata: Metadata = { title: "Giao thông — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminTransitPage() {
  const [docs, pageSeo, typeOptions] = await Promise.all([
    listTransit({}),
    getPageSeoConfig(),
    listActiveCategoryOptions("giao-thong"),
  ]);
  const rows = docs.map(toTransitRow);
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Nội dung</span>
        <h1 className="type-h1">Giao thông</h1>
        <p className="qp-admin-head__desc">Quản lý các tuyến xe khách, xe buýt qua địa bàn huyện — thêm, sửa, xoá và ẩn/hiện.</p>
      </div>
      <ModuleTabs pageKey="/giao-thong" pageLabel="Giao thông" listLabel="Danh sách tuyến giao thông" seoInitial={pageSeo["/giao-thong"] ?? {}}>
        <TransitManager initial={rows} typeOptions={typeOptions} />
      </ModuleTabs>
    </>
  );
}
