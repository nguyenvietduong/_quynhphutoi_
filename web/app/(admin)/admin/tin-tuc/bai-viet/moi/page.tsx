import type { Metadata } from "next";
import { listActiveCategoryOptions } from "@/lib/categories";
import { ArticleEditorPage, ARTICLE_FORM_EMPTY } from "@/components/admin/ArticleEditorPage";

export const metadata: Metadata = { title: "Viết bài mới — Tin tức", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const catOpts = await listActiveCategoryOptions("tin-tuc");
  const categories = catOpts.map((c) => c.name);
  const initialForm = { ...ARTICLE_FORM_EMPTY, category: categories[0] ?? "" };
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Tin tức</span>
        <h1 className="type-h1">Viết bài mới</h1>
      </div>
      <ArticleEditorPage initialForm={initialForm} categories={categories} />
    </>
  );
}
