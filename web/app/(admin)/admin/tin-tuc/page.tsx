import type { Metadata } from "next";
import { listAllArticles, toArticleRow } from "@/lib/articles";
import { getNewsPageConfig, newsCandidatesBySlugs } from "@/lib/news-page";
import { getPageSeoConfig } from "@/lib/page-seo";
import { externalNewsConfigured } from "@/lib/external-news";
import { ModuleTabs } from "@/components/admin/ModuleTabs";
import { ArticleManager } from "@/components/admin/ArticleManager";
import { NewsPageManager } from "@/components/admin/NewsPageManager";

export const metadata: Metadata = { title: "Tin tức — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const [docs, newsConfig, pageSeo, externalEnabled] = await Promise.all([
    listAllArticles(), getNewsPageConfig(), getPageSeoConfig(), externalNewsConfigured(),
  ]);
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
        <ArticleManager initial={rows} externalEnabled={externalEnabled} />
      </ModuleTabs>
    </>
  );
}
