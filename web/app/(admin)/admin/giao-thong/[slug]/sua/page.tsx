import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTransitBySlug, toTransitRow } from "@/lib/transit";
import { listActiveCategoryOptions } from "@/lib/categories";
import { TransitEditorPage, type TransitForm } from "@/components/admin/TransitEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";

export const metadata: Metadata = { title: "Sửa tuyến giao thông — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditTransitPage({ params }: { params: Promise<{ slug: string }> }) {
  const perm = await getModulePerm("giao-thong");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/giao-thong");

  const { slug } = await params;
  const [doc, typeOptions] = await Promise.all([
    getTransitBySlug(slug),
    listActiveCategoryOptions("giao-thong"),
  ]);
  if (!doc) notFound();

  const row = toTransitRow(doc);
  const initialForm: TransitForm = {
    name: row.name,
    type: row.type,
    origin: row.origin ?? "",
    destination: row.destination ?? "",
    stops: Array.isArray(row.stops) ? row.stops.join("\n") : "",
    operator: row.operator ?? "",
    phone: row.phone ?? "",
    fare: row.fare ?? "",
    frequency: row.frequency ?? "",
    duration: row.duration ?? "",
    distance: row.distance ?? "",
    note: row.note ?? "",
    verified: row.verified ?? false,
    active: row.active ?? true,
    seo: row.seo,
  };

  return (
    <TransitEditorPage editingSlug={slug} initialForm={initialForm} typeOptions={typeOptions} />
  );
}
