import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listActiveCategoryOptions } from "@/lib/categories";
import { ArticleEditorPage, ARTICLE_FORM_EMPTY } from "@/components/admin/ArticleEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";

export const metadata: Metadata = { title: "Viết bài mới — Tin tức", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const perm = await getModulePerm("tin-tuc");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/tin-tuc");

  const catOpts = await listActiveCategoryOptions("tin-tuc");
  const categories = catOpts.map((c) => c.name);
  const initialForm = { ...ARTICLE_FORM_EMPTY, category: categories[0] ?? "" };
  return (
    <ArticleEditorPage initialForm={initialForm} categories={categories} />
  );
}
