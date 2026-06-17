import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug, toArticleRow } from "@/lib/articles";
import { listActiveCategoryOptions } from "@/lib/categories";
import { ArticleEditorPage, type ArticleForm } from "@/components/admin/ArticleEditorPage";

export const metadata: Metadata = { title: "Sửa bài viết — Tin tức", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [doc, catOpts] = await Promise.all([getArticleBySlug(slug), listActiveCategoryOptions("tin-tuc")]);
  if (!doc) notFound();

  const row = toArticleRow(doc);
  const categories = catOpts.map((c) => c.name);

  const initialForm: ArticleForm = {
    title: row.title, excerpt: row.excerpt, category: row.category, scope: row.scope,
    tags: (row.tags ?? []).join(", "),
    coverImage: row.coverImage, coverAlt: row.coverAlt,
    authorName: row.authorName, authorTitle: row.authorTitle,
    bodyHtml: row.bodyHtml, featured: row.featured, status: row.status,
    seoMetaTitle: row.seo.metaTitle ?? "", seoMetaDescription: row.seo.metaDescription ?? "",
    seoKeywords: (row.seo.keywords ?? []).join(", "),
    seoOgImage: row.seo.ogImage ?? "", seoNoindex: !!row.seo.noindex,
  };

  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Tin tức</span>
        <h1 className="type-h1">Sửa bài viết</h1>
      </div>
      <ArticleEditorPage editingSlug={slug} initialForm={initialForm} categories={categories} />
    </>
  );
}
