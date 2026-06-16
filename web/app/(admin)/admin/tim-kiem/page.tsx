import type { Metadata } from "next";
import { getPageSeoConfig } from "@/lib/page-seo";
import { ModuleTabs } from "@/components/admin/ModuleTabs";

export const metadata: Metadata = { title: "Tìm kiếm — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSearchPage() {
  const pageSeo = await getPageSeoConfig();
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Trang khác</span>
        <h1 className="type-h1">Tìm kiếm</h1>
        <p className="qp-admin-head__desc">Trang kết quả tìm kiếm toàn cổng. Mặc định đặt noindex (không cho Google lập chỉ mục trang kết quả) — bạn vẫn có thể chỉnh tiêu đề/mô tả ở tab SEO.</p>
      </div>
      <ModuleTabs pageKey="/tim-kiem" pageLabel="Tìm kiếm" seoInitial={pageSeo["/tim-kiem"] ?? {}} />
    </>
  );
}
