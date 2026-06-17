// Seed tuyến giao thông qua huyện Quỳnh Phụ. Idempotent: xóa sạch + insert lại.
// Chạy: npm run seed:transit
import { MongoClient } from "mongodb";
import { isCli } from "./_cli";
import type { TransitDoc } from "../lib/transit";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "quynhphu";
const TLABEL: Record<string, string> = { "lien-tinh": "Liên tỉnh", "noi-tinh": "Nội tỉnh", "xe-buyt": "Xe buýt" };

type Seed = Omit<TransitDoc, "_id" | "createdAt" | "updatedAt">;
const ROUTES: Seed[] = [
  {
    slug: "quynh-coi-ha-noi", name: "Quỳnh Côi – Hà Nội", type: "lien-tinh", typeLabel: TLABEL["lien-tinh"],
    origin: "Bến xe Quỳnh Côi", destination: "Bến xe Giáp Bát / Nước Ngầm (Hà Nội)",
    stops: ["Quỳnh Côi", "An Bài", "QL10", "Cao tốc Hải Phòng – Hà Nội", "Giáp Bát"],
    operator: "Nhà xe Hoàng Long", phone: "0227 3861 555", fare: "100.000đ", frequency: "5:00, 7:00, 9:00, 13:00, 15:00",
    duration: "2 giờ 30 phút", distance: "110 km", note: "Đặt vé trước giờ cao điểm lễ Tết.", verified: true, active: true,
  },
  {
    slug: "quynh-phu-hai-phong", name: "Quỳnh Phụ – Hải Phòng", type: "lien-tinh", typeLabel: TLABEL["lien-tinh"],
    origin: "Bến xe Quỳnh Côi", destination: "Bến xe Cầu Rào (Hải Phòng)",
    stops: ["Quỳnh Côi", "An Bài", "QL10", "Vĩnh Bảo", "Cầu Rào"],
    operator: "Nhà xe Đất Cảng", phone: "0225 3777 888", fare: "80.000đ", frequency: "6:00, 10:00, 14:00, 16:30",
    duration: "1 giờ 45 phút", distance: "70 km", verified: true, active: true,
  },
  {
    slug: "quynh-phu-quang-ninh", name: "Quỳnh Phụ – Quảng Ninh", type: "lien-tinh", typeLabel: TLABEL["lien-tinh"],
    origin: "Bến xe Quỳnh Côi", destination: "Bến xe Bãi Cháy (Hạ Long)",
    stops: ["Quỳnh Côi", "QL10", "Hải Phòng", "Uông Bí", "Bãi Cháy"],
    operator: "Nhà xe Phúc Xuyên", phone: "0203 3666 999", fare: "150.000đ", frequency: "5:30, 12:00",
    duration: "3 giờ 30 phút", distance: "180 km", verified: false, active: true,
  },
  {
    slug: "quynh-coi-thanh-pho-thai-binh", name: "Quỳnh Côi – TP Thái Bình", type: "noi-tinh", typeLabel: TLABEL["noi-tinh"],
    origin: "Bến xe Quỳnh Côi", destination: "Bến xe Trung tâm (TP Thái Bình)",
    stops: ["Quỳnh Côi", "Đông Hưng", "QL10", "TP Thái Bình"],
    operator: "HTX Vận tải Quỳnh Phụ", phone: "0227 3862 111", fare: "35.000đ", frequency: "30 phút/chuyến (5:00–18:00)",
    duration: "1 giờ", distance: "30 km", verified: true, active: true,
  },
  {
    slug: "quynh-coi-hung-ha", name: "Quỳnh Côi – Hưng Hà", type: "noi-tinh", typeLabel: TLABEL["noi-tinh"],
    origin: "Bến xe Quỳnh Côi", destination: "Thị trấn Hưng Hà",
    stops: ["Quỳnh Côi", "An Bài", "Hưng Hà"],
    operator: "HTX Vận tải Quỳnh Phụ", phone: "0227 3862 111", fare: "25.000đ", frequency: "45 phút/chuyến",
    duration: "40 phút", distance: "22 km", verified: false, active: true,
  },
  {
    slug: "xe-buyt-08-quynh-coi-thai-binh", name: "Buýt 08: Quỳnh Côi – TP Thái Bình", type: "xe-buyt", typeLabel: TLABEL["xe-buyt"],
    origin: "Quỳnh Côi", destination: "Bến xe khách Thái Bình",
    stops: ["Quỳnh Côi", "An Bài", "Đông Hưng", "Ngã tư Gia Lễ", "TP Thái Bình"],
    operator: "Xe buýt Thái Bình", phone: "1900 0000", fare: "10.000đ", frequency: "15–20 phút/chuyến (5:00–19:00)",
    duration: "1 giờ 15 phút", distance: "30 km", note: "Vé tháng cho học sinh, sinh viên.", verified: true, active: true,
  },
  {
    slug: "xe-buyt-noi-huyen-quynh-phu", name: "Buýt nội huyện Quỳnh Phụ", type: "xe-buyt", typeLabel: TLABEL["xe-buyt"],
    origin: "Thị trấn Quỳnh Côi", destination: "Thị trấn An Bài",
    stops: ["Quỳnh Côi", "Quỳnh Hồng", "Quỳnh Ngọc", "An Vũ", "An Bài"],
    operator: "HTX Vận tải Quỳnh Phụ", fare: "7.000đ", frequency: "30 phút/chuyến",
    duration: "35 phút", distance: "12 km", verified: false, active: true,
  },
];

export function seedDocs() {
  const now = new Date();
  return ROUTES.map((r) => ({ ...r, createdAt: now, updatedAt: now }));
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const col = client.db(dbName).collection<TransitDoc>("transit");
    await col.createIndex({ slug: 1 }, { unique: true });
    await col.createIndex({ type: 1, name: 1 });
    await col.createIndex({ name: "text", origin: "text", destination: "text" }, { default_language: "none" });
    await col.deleteMany({});
    const now = new Date();
    await col.insertMany(ROUTES.map((r) => ({ ...r, createdAt: now, updatedAt: now })));
    const cnt = (t: string) => ROUTES.filter((r) => r.type === t).length;
    console.log(`✓ Liên tỉnh : ${cnt("lien-tinh")}`);
    console.log(`✓ Nội tỉnh  : ${cnt("noi-tinh")}`);
    console.log(`✓ Xe buýt   : ${cnt("xe-buyt")}`);
    console.log(`\n✅ Đã seed ${ROUTES.length} tuyến giao thông vào "${dbName}".`);
  } finally {
    await client.close();
  }
}
if (isCli(import.meta.url)) main().catch((e) => { console.error("❌ Seed thất bại:", e); process.exit(1); });
