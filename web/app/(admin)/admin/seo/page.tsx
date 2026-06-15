import type { Metadata } from "next";
import { getPageSeoConfig } from "@/lib/page-seo";
import { PageSeoManager } from "@/components/admin/PageSeoManager";

export const metadata: Metadata = { title: "SEO từng trang — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPageSeoPage() {
  const config = await getPageSeoConfig();
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Hệ thống</span>
        <h1 className="type-h1">SEO từng trang</h1>
        <p className="qp-admin-head__desc">Đặt tiêu đề, mô tả, từ khoá và ảnh chia sẻ riêng cho từng trang. SEO chung toàn site nằm ở Cài đặt → SEO toàn site.</p>
      </div>
      <PageSeoManager initialConfig={config} />
    </>
  );
}
