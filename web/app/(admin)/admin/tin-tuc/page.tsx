import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listAllArticles, toArticleRow } from "@/lib/articles";
import { getNewsPageConfig, newsCandidatesBySlugs } from "@/lib/news-page";
import { getPageSeoConfig } from "@/lib/page-seo";
import { externalNewsConfigured } from "@/lib/external-news";
import { listActiveCategoryOptions } from "@/lib/categories";
import { ModuleTabs } from "@/components/admin/ModuleTabs";
import { ArticleManager } from "@/components/admin/ArticleManager";
import { NewsPageManager } from "@/components/admin/NewsPageManager";
import { getModulePerm } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Tin tức — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const perm = await getModulePerm("tin-tuc");
  if (!perm || perm === "none") redirect("/admin/403");

  const [docs, newsConfig, pageSeo, externalEnabled, catOpts] = await Promise.all([
    listAllArticles(), getNewsPageConfig(), getPageSeoConfig(), externalNewsConfigured(), listActiveCategoryOptions("tin-tuc"),
  ]);
  // Danh mục tin tức từ DB (admin quản lý ở /admin/danh-mục). DB rỗng → fallback list cố định trong ArticleManager.
  const categoryNames = catOpts.map((c) => c.name);
  // Tiêu đề cho các bài đã chọn thủ công (để picker hiển thị chip ngay, không cần search).
  const selectedSlugs = [
    newsConfig.featured.heroSlug,
    ...newsConfig.featured.manualSlugs,
    ...newsConfig.popular.manualSlugs,
  ];
  const newsTitles = Object.fromEntries(
    (await newsCandidatesBySlugs(selectedSlugs)).map((c) => [c.slug, c.title] as const),
  );
  const rows = docs.map(toArticleRow);

  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Nội dung</span>
        <h1 className="type-h1">Tin tức</h1>
        <p className="qp-admin-head__desc">Soạn bài, cấu hình bố cục trang Tin tức công khai và tối ưu SEO — chuyển qua lại bằng các tab bên dưới.</p>
      </div>
      <ModuleTabs
        pageKey="/tin-tuc"
        pageLabel="Tin tức"
        listLabel="Danh sách bài viết"
        seoInitial={pageSeo["/tin-tuc"] ?? {}}
        manage={<NewsPageManager initialConfig={newsConfig} initialTitles={newsTitles} />}
      >
        <ArticleManager initial={rows} externalEnabled={externalEnabled} categories={categoryNames} perm={perm} />
      </ModuleTabs>
    </>
  );
}
