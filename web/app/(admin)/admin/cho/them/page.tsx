import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listActiveCategoryOptions } from "@/lib/categories";
import { MarketEditorPage, MARKET_FORM_EMPTY, type MarketForm } from "@/components/admin/MarketEditorPage";
import { getModulePerm } from "@/lib/admin-guard";
import { hasPerm } from "@/lib/perm";
import { WARDS } from "@/lib/wards";

export const metadata: Metadata = { title: "Thêm chợ / điểm mua bán — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function NewMarketPage() {
  const perm = await getModulePerm("cho");
  if (!perm || !hasPerm(perm, "edit")) redirect("/admin/cho");

  const categoryOptions = await listActiveCategoryOptions("cho");

  const initialForm: MarketForm = {
    ...MARKET_FORM_EMPTY,
    category: categoryOptions[0]?.slug ?? "",
    wardSlug: WARDS[0]?.slug ?? "",
  };

  return (
    <MarketEditorPage initialForm={initialForm} categoryOptions={categoryOptions} />
  );
}
