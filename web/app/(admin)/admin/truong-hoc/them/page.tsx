import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listActiveCategoryOptions } from "@/lib/categories";
import { SchoolEditorPage, SCHOOL_FORM_EMPTY, type SchoolForm } from "@/components/admin/SchoolEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";

export const metadata: Metadata = { title: "Thêm trường học — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewSchoolPage() {
  const perm = await getModulePerm("truong-hoc");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/truong-hoc");

  const [levelOptions, typeOptions] = await Promise.all([
    listActiveCategoryOptions("truong-hoc"),
    listActiveCategoryOptions("loai-hinh-truong"),
  ]);

  const initialForm: SchoolForm = {
    ...SCHOOL_FORM_EMPTY,
    level: levelOptions[0]?.slug ?? "",
    levels: levelOptions[0]?.slug ? [levelOptions[0].slug] : [],
    type: typeOptions[0]?.slug ?? "",
  };

  return (
    <SchoolEditorPage initialForm={initialForm} levelOptions={levelOptions} typeOptions={typeOptions} />
  );
}
