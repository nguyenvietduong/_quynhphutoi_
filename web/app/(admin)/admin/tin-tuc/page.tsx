import type { Metadata } from "next";
import { listAllArticles, toArticleRow } from "@/lib/articles";
import { getNewsPageConfig, newsCandidatesBySlugs } from "@/lib/news-page";
import { externalNewsConfigured } from "@/lib/external-news";
import { ArticlesAdmin } from "@/components/admin/ArticlesAdmin";

export const metadata: Metadata = { title: "Tin tức — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const [docs, newsConfig, externalEnabled] = await Promise.all([
    listAllArticles(), getNewsPageConfig(), externalNewsConfigured(),
  ]);
  // Tiêu đề cho các bài đã chọn thủ công (để picker hiển thị chip ngay, không cần search).
  const selectedSlugs = [
    newsConfig.featured.heroSlug,
    ...newsConfig.featured.manualSlugs,
    ...newsConfig.popular.manualSlugs,
  ];
  const initialTitles = Object.fromEntries(
    (await newsCandidatesBySlugs(selectedSlugs)).map((c) => [c.slug, c.title] as const),
  );
  const rows = docs.map(toArticleRow);
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Nội dung</span>
        <h1 className="type-h1">Tin tức</h1>
        <p className="qp-admin-head__desc">Soạn, sửa, xuất bản và gỡ bài viết. Bài ở trạng thái “Đã xuất bản” sẽ hiển thị công khai tại trang Tin tức.</p>
      </div>
      <ArticlesAdmin rows={rows} newsConfig={newsConfig} initialTitles={initialTitles} externalEnabled={externalEnabled} />
    </>
  );
}
