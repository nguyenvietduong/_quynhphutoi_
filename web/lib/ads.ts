// Quảng cáo tự quản lý (direct sponsors). Mỗi vị trí (placement) có thể có nhiều
// quảng cáo → xoay vòng theo trọng số. Chỗ chưa bán → AdSlot tự fallback AdSense.
import { getDb, ensureIndexes } from "@/lib/db";
import { ObjectId } from "mongodb";

export type AdPlacement = "home-banner" | "detail-aside" | "in-feed" | "footer" | "sticky-bottom";

export const AD_PLACEMENTS: { slug: AdPlacement; label: string; ratio: string; hint: string }[] = [
  { slug: "home-banner", label: "Banner trang chủ", ratio: "21 / 5", hint: "Ảnh ngang, ~1200×285" },
  { slug: "footer", label: "Banner chân trang", ratio: "21 / 5", hint: "Ảnh ngang, ~1200×285" },
  { slug: "detail-aside", label: "Box cột phải (chi tiết)", ratio: "6 / 5", hint: "Ảnh ~600×500 (gần vuông)" },
  { slug: "in-feed", label: "Native trong danh sách", ratio: "16 / 9", hint: "Ảnh thẻ tin 16:9, ~800×450" },
  { slug: "sticky-bottom", label: "Thanh nổi đáy màn hình", ratio: "1 / 1", hint: "Ảnh nhỏ gần vuông, ~200×200" },
];
export const PLACEMENT_LABEL: Record<AdPlacement, string> = Object.fromEntries(AD_PLACEMENTS.map((p) => [p.slug, p.label])) as Record<AdPlacement, string>;
export const isPlacement = (v: string): v is AdPlacement => AD_PLACEMENTS.some((p) => p.slug === v);

export type AdDoc = {
  _id?: ObjectId;
  advertiser: string;        // tên nhãn hàng
  title: string;             // dòng chữ hiển thị (native) / alt
  description?: string;      // mô tả chi tiết (hiển thị ở trang chi tiết quảng cáo)
  imageDesktop: string;      // ảnh chính
  imageMobile?: string;      // ảnh cho mobile (tuỳ chọn)
  linkUrl: string;           // link đích (tuỳ chọn — rỗng nếu chỉ liên hệ qua SĐT)
  phone?: string;            // SĐT liên hệ (tuỳ chọn)
  placement: AdPlacement;
  weight: number;            // trọng số xoay vòng (≥1)
  startDate?: Date | null;
  endDate?: Date | null;
  active: boolean;
  impressions: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function ads() {
  const db = await getDb();
  const col = db.collection<AdDoc>("ads");
  await ensureIndexes("ads", () => col.createIndex({ placement: 1, active: 1 }));
  return col;
}

// Quảng cáo đang chạy cho 1 vị trí (active + trong khoảng ngày).
export async function listActiveAds(placement: AdPlacement) {
  const now = new Date();
  const col = await ads();
  const rows = await col.find({ placement, active: true }).toArray();
  return rows.filter((a) => (!a.startDate || a.startDate <= now) && (!a.endDate || a.endDate >= now));
}

// Tất cả quảng cáo đang chạy (mọi vị trí) — dùng cho thanh quảng cáo dưới đáy.
export async function listAllActiveAds() {
  const now = new Date();
  const rows = await (await ads()).find({ active: true }).sort({ createdAt: -1 }).toArray();
  return rows.filter((a) => (!a.startDate || a.startDate <= now) && (!a.endDate || a.endDate >= now));
}

export async function listAllAds() {
  return (await ads()).find({}).sort({ placement: 1, createdAt: -1 }).toArray();
}

export async function getAd(id: string) {
  if (!ObjectId.isValid(id)) return null;
  return (await ads()).findOne({ _id: new ObjectId(id) });
}

// Quảng cáo công khai cho trang chi tiết: phải đang chạy + trong khoảng ngày.
export async function getPublicAd(id: string) {
  const ad = await getAd(id);
  if (!ad || !ad.active) return null;
  const now = new Date();
  if ((ad.startDate && ad.startDate > now) || (ad.endDate && ad.endDate < now)) return null;
  return ad;
}

export type CreateAdInput = Omit<AdDoc, "_id" | "impressions" | "clicks" | "createdAt" | "updatedAt">;

export async function createAd(input: CreateAdInput) {
  const now = new Date();
  const doc: AdDoc = { ...input, weight: Math.max(1, input.weight || 1), impressions: 0, clicks: 0, createdAt: now, updatedAt: now };
  const { insertedId } = await (await ads()).insertOne(doc);
  return { ...doc, _id: insertedId };
}

export async function updateAd(id: string, patch: Partial<CreateAdInput>) {
  if (!ObjectId.isValid(id)) return false;
  await (await ads()).updateOne({ _id: new ObjectId(id) }, { $set: { ...patch, updatedAt: new Date() } });
  return true;
}

export async function deleteAd(id: string) {
  if (!ObjectId.isValid(id)) return 0;
  const res = await (await ads()).deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount;
}

export async function recordImpression(id: string) {
  if (!ObjectId.isValid(id)) return;
  await (await ads()).updateOne({ _id: new ObjectId(id) }, { $inc: { impressions: 1 } });
}

// Đếm click. Trả true nếu tìm thấy quảng cáo (để route quyết định redirect/404).
// Click giờ dẫn vào trang chi tiết nội bộ /quang-cao/[id] (không redirect thẳng ra ngoài).
export async function recordClick(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await (await ads()).updateOne({ _id: new ObjectId(id) }, { $inc: { clicks: 1 } });
  return res.matchedCount > 0;
}
