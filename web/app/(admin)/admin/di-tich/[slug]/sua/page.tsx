import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getRelicBySlug, toRelicRow } from "@/lib/relics";
import { listActiveCategoryOptions } from "@/lib/categories";
import { RelicEditorPage, type RelicForm } from "@/components/admin/RelicEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";

export const metadata: Metadata = { title: "Sửa di tích — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditRelicPage({ params }: { params: Promise<{ slug: string }> }) {
  const perm = await getModulePerm("di-tich");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/di-tich");

  const { slug } = await params;
  const [doc, typeOptions, rankingOptions] = await Promise.all([
    getRelicBySlug(slug),
    listActiveCategoryOptions("di-tich"),
    listActiveCategoryOptions("xep-hang-di-tich"),
  ]);
  if (!doc) notFound();

  const row = toRelicRow(doc);
  const initialForm: RelicForm = {
    name: row.name,
    type: row.type,
    wardSlug: row.wardSlug,
    address: row.address ?? "",
    description: row.description ?? "",
    era: row.era ?? "",
    worship: row.worship ?? "",
    festival: row.festival ?? "",
    ranking: row.ranking ?? "",
    recognizedYear: row.recognizedYear ? String(row.recognizedYear) : "",
    images: row.images ?? [],
    verified: row.verified ?? false,
    featured: row.featured ?? false,
    active: row.active ?? true,
    seo: row.seo,
  };

  return (
    <RelicEditorPage editingSlug={slug} initialForm={initialForm} typeOptions={typeOptions} rankingOptions={rankingOptions} />
  );
}
