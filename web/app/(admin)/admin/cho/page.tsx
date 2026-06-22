import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listMarket, toMarketRow } from "@/lib/market";
import { MarketManager } from "@/components/admin/MarketManager";
import { listActiveCategoryOptions } from "@/lib/categories";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";
import { getModulePerm } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Chợ & Mua bán — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminMarketPage() {
  const perm = await getModulePerm("cho");
  if (!perm || perm === "none") redirect("/admin/403");

  const [docs, pageSeo, categoryOptions] = await Promise.all([listMarket({}), getPageSeoConfig(), listActiveCategoryOptions("cho")]);
  const rows = docs.map(toMarketRow);
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Nội dung</span>
        <h1 className="type-h1">Chợ & Mua bán</h1>
        <p className="qp-admin-head__desc">Quản lý chợ phiên, đặc sản địa phương và rao vặt trên địa bàn huyện — thêm, sửa, xoá và ẩn/hiện.</p>
      </div>
      <ModuleTabs pageKey="/cho" pageLabel="Chợ" listLabel="Danh sách chợ & mua bán" seoInitial={pageSeo["/cho"] ?? {}}>
        <MarketManager initial={rows} categoryOptions={categoryOptions} perm={perm} />
      </ModuleTabs>
    </>
  );
}
