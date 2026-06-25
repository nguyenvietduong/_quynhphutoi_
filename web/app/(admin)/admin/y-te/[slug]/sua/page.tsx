import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getHealthBySlug, toHealthRow } from "@/lib/health";
import { listActiveCategoryOptions } from "@/lib/categories";
import { HealthEditorPage, type HealthForm } from "@/components/admin/HealthEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";

export const metadata: Metadata = { title: "Sửa cơ sở y tế — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditHealthPage({ params }: { params: Promise<{ slug: string }> }) {
  const perm = await getModulePerm("y-te");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/y-te");

  const { slug } = await params;
  const [doc, typeOptions, ownershipOptions] = await Promise.all([
    getHealthBySlug(slug),
    listActiveCategoryOptions("y-te"),
    listActiveCategoryOptions("so-huu-y-te"),
  ]);
  if (!doc) notFound();

  const row = toHealthRow(doc);
  const initialForm: HealthForm = {
    name: row.name,
    shortName: row.shortName ?? "",
    type: row.type,
    ownership: row.ownership,
    wardSlug: row.wardSlug,
    address: row.address ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    website: row.website ?? "",
    director: row.director ?? "",
    hours: row.hours ?? "",
    emergency: row.emergency ?? false,
    beds: row.beds ? String(row.beds) : "",
    specialties: row.specialties ?? "",
    foundedYear: row.foundedYear ? String(row.foundedYear) : "",
    description: row.description ?? "",
    image: row.image ?? "",
    sourceUrl: row.sourceUrl ?? "",
    verified: row.verified,
    active: row.active,
    seo: row.seo,
  };

  return (
    <HealthEditorPage editingSlug={slug} initialForm={initialForm} typeOptions={typeOptions} ownershipOptions={ownershipOptions} />
  );
}
