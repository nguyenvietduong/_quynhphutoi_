import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listActiveCategoryOptions } from "@/lib/categories";
import { HealthEditorPage, HEALTH_FORM_EMPTY, type HealthForm } from "@/components/admin/HealthEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";
import { WARDS } from "@/lib/wards";

export const metadata: Metadata = { title: "Thêm cơ sở y tế — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewHealthPage() {
  const perm = await getModulePerm("y-te");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/y-te");

  const [typeOptions, ownershipOptions] = await Promise.all([
    listActiveCategoryOptions("y-te"),
    listActiveCategoryOptions("so-huu-y-te"),
  ]);

  const initialForm: HealthForm = {
    ...HEALTH_FORM_EMPTY,
    type: typeOptions[0]?.slug ?? "",
    ownership: ownershipOptions[0]?.slug ?? "",
    wardSlug: WARDS[0]?.slug ?? "",
  };

  return (
    <HealthEditorPage initialForm={initialForm} typeOptions={typeOptions} ownershipOptions={ownershipOptions} />
  );
}
