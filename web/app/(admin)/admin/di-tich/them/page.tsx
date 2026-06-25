import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listActiveCategoryOptions } from "@/lib/categories";
import { RelicEditorPage, RELIC_FORM_EMPTY, type RelicForm } from "@/components/admin/RelicEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";
import { WARDS } from "@/lib/wards";

export const metadata: Metadata = { title: "Thêm di tích — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewRelicPage() {
  const perm = await getModulePerm("di-tich");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/di-tich");

  const [typeOptions, rankingOptions] = await Promise.all([
    listActiveCategoryOptions("di-tich"),
    listActiveCategoryOptions("xep-hang-di-tich"),
  ]);

  const initialForm: RelicForm = {
    ...RELIC_FORM_EMPTY,
    type: typeOptions[0]?.slug ?? "",
    wardSlug: WARDS[0]?.slug ?? "",
  };

  return (
    <RelicEditorPage initialForm={initialForm} typeOptions={typeOptions} rankingOptions={rankingOptions} />
  );
}
