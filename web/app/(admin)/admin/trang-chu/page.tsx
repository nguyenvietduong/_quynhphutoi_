import type { Metadata } from "next";
import { getHomeSections, listHomeCandidates } from "@/lib/home-sections";
import { getPageSeoConfig } from "@/lib/page-seo";
import { HomeSectionsManager } from "@/components/admin/HomeSectionsManager";
import { ModuleTabs } from "@/components/admin/ModuleTabs";

export const metadata: Metadata = { title: "Trang chủ — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHomeSectionsPage() {
  const [config, candidates, pageSeo] = await Promise.all([
    getHomeSections(), listHomeCandidates(), getPageSeoConfig(),
  ]);
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Hệ thống</span>
        <h1 className="type-h1">Trang chủ</h1>
        <p className="qp-admin-head__desc">Cấu hình hiển thị các khối trên trang chủ (tab “Quản lý trang”) và tối ưu SEO trang chủ (tab “SEO”).</p>
      </div>
      <ModuleTabs
        pageKey="/"
        pageLabel="Trang chủ"
        seoInitial={pageSeo["/"] ?? {}}
        manage={<HomeSectionsManager initialConfig={config} candidates={candidates} />}
      />
    </>
  );
}
