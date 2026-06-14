import type { Metadata } from "next";
import { listAllAds } from "@/lib/ads";
import { AdManager, type AdRow } from "@/components/ads/AdManager";

export const metadata: Metadata = { title: "Quản lý quảng cáo — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminAdsPage() {
  const docs = await listAllAds();
  const initial: AdRow[] = docs.map((a) => ({
    id: a._id!.toString(), advertiser: a.advertiser, title: a.title, description: a.description ?? "",
    imageDesktop: a.imageDesktop, imageMobile: a.imageMobile ?? "", linkUrl: a.linkUrl, phone: a.phone ?? "",
    placement: a.placement, weight: a.weight,
    startDate: a.startDate ? a.startDate.toISOString().slice(0, 10) : "",
    endDate: a.endDate ? a.endDate.toISOString().slice(0, 10) : "",
    active: a.active, impressions: a.impressions, clicks: a.clicks,
  }));

  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Hệ thống</span>
        <h1 className="type-h1">Quản lý quảng cáo</h1>
        <p className="qp-admin-head__desc">Thêm banner/quảng cáo của nhãn hàng, chọn vị trí hiển thị và theo dõi lượt xem · click.</p>
      </div>
      <AdManager initial={initial} />
    </>
  );
}
