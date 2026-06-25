import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listActiveCategoryOptions } from "@/lib/categories";
import { TransitEditorPage, TRANSIT_FORM_EMPTY, type TransitForm } from "@/components/admin/TransitEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";

export const metadata: Metadata = { title: "Thêm tuyến giao thông — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewTransitPage() {
  const perm = await getModulePerm("giao-thong");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/giao-thong");

  const typeOptions = await listActiveCategoryOptions("giao-thong");

  const initialForm: TransitForm = {
    ...TRANSIT_FORM_EMPTY,
    type: typeOptions[0]?.slug ?? "",
  };

  return (
    <TransitEditorPage initialForm={initialForm} typeOptions={typeOptions} />
  );
}
