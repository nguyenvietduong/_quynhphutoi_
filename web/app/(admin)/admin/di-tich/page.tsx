import type { Metadata } from "next";
import { listRelics, toRelicRow } from "@/lib/relics";
import { listActiveCategoryOptions } from "@/lib/categories";
import { RelicsManager } from "@/components/admin/RelicsManager";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";

export const metadata: Metadata = { title: "Di tích — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminRelicsPage() {
  const [docs, pageSeo, typeOptions, rankingOptions] = await Promise.all([
    listRelics({}),
    getPageSeoConfig(),
    listActiveCategoryOptions("di-tich"),
    listActiveCategoryOptions("xep-hang-di-tich"),
  ]);
  const rows = docs.map(toRelicRow);
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Nội dung</span>
        <h1 className="type-h1">Di tích</h1>
        <p className="qp-admin-head__desc">Quản lý di tích lịch sử - văn hoá trên địa bàn huyện — thêm, sửa, xoá và ẩn/hiện.</p>
      </div>
      <ModuleTabs pageKey="/di-tich" pageLabel="Di tích" listLabel="Danh sách di tích" seoInitial={pageSeo["/di-tich"] ?? {}}>
        <RelicsManager initial={rows} typeOptions={typeOptions} rankingOptions={rankingOptions} />
      </ModuleTabs>
    </>
  );
}
