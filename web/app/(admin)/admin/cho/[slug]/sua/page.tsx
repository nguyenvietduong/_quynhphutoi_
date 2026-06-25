import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getMarketBySlug, toMarketRow } from "@/lib/market";
import { listActiveCategoryOptions } from "@/lib/categories";
import { MarketEditorPage, type MarketForm } from "@/components/admin/MarketEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";

export const metadata: Metadata = { title: "Sửa chợ / điểm mua bán — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditMarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const perm = await getModulePerm("cho");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/cho");

  const { slug } = await params;
  const [doc, categoryOptions] = await Promise.all([
    getMarketBySlug(slug),
    listActiveCategoryOptions("cho"),
  ]);
  if (!doc) notFound();

  const row = toMarketRow(doc);
  const initialForm: MarketForm = {
    name: row.name,
    category: row.category,
    wardSlug: row.wardSlug,
    address: row.address ?? "",
    description: row.description ?? "",
    schedule: row.schedule ?? "",
    priceText: row.priceText ?? "",
    unit: row.unit ?? "",
    contactName: row.contactName ?? "",
    contactPhone: row.contactPhone ?? "",
    image: row.image ?? "",
    sourceUrl: "",
    verified: row.verified ?? false,
    featured: row.featured ?? false,
    active: row.active ?? true,
    seo: row.seo,
  };

  return (
    <MarketEditorPage editingSlug={slug} initialForm={initialForm} categoryOptions={categoryOptions} />
  );
}
