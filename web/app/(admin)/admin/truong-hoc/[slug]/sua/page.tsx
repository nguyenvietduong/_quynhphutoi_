import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSchoolBySlug, toSchoolRow } from "@/lib/schools";
import { listActiveCategoryOptions } from "@/lib/categories";
import { SchoolEditorPage, type SchoolForm } from "@/components/admin/SchoolEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";

export const metadata: Metadata = { title: "Sửa trường học — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditSchoolPage({ params }: { params: Promise<{ slug: string }> }) {
  const perm = await getModulePerm("truong-hoc");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/truong-hoc");

  const { slug } = await params;
  const [doc, levelOptions, typeOptions] = await Promise.all([
    getSchoolBySlug(slug),
    listActiveCategoryOptions("truong-hoc"),
    listActiveCategoryOptions("loai-hinh-truong"),
  ]);
  if (!doc) notFound();

  const row = toSchoolRow(doc);
  const initialForm: SchoolForm = {
    name: row.name,
    shortName: row.shortName ?? "",
    level: row.level,
    levels: row.levels ?? [row.level],
    type: row.type,
    wardSlug: row.wardSlug,
    address: row.address ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    website: row.website ?? "",
    principal: row.principal ?? "",
    foundedYear: row.foundedYear ? String(row.foundedYear) : "",
    description: row.description ?? "",
    image: row.image ?? "",
    sourceUrl: row.sourceUrl ?? "",
    verified: row.verified,
    active: row.active,
    seo: row.seo,
  };

  return (
    <SchoolEditorPage editingSlug={slug} initialForm={initialForm} levelOptions={levelOptions} typeOptions={typeOptions} />
  );
}
