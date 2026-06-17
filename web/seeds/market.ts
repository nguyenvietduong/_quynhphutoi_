// Seed Chợ & Mua bán: chợ phiên, đặc sản, rao vặt. Xóa sạch + insert lại.
// Chạy: npm run seed:market
import { MongoClient } from "mongodb";
import { isCli } from "./_cli";
import type { MarketDoc } from "../lib/market";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "quynhphu";
// Nhãn khớp slug danh mục module "cho" (collection `categories`).
const CLABEL: Record<string, string> = { "cho-phien": "Chợ phiên", "dac-san": "Đặc sản", "rao-vat": "Rao vặt" };

type Seed = Omit<MarketDoc, "_id" | "createdAt" | "updatedAt">;
const add = (s: Partial<Seed> & Pick<Seed, "slug" | "name" | "category" | "wardSlug">): Seed =>
  ({ categoryLabel: CLABEL[s.category], verified: false, featured: false, active: true, ...s });

const ITEMS: Seed[] = [
  // ── Chợ phiên ──
  add({ slug: "cho-quynh-coi", name: "Chợ Quỳnh Côi", category: "cho-phien", wardSlug: "quynh-coi", address: "Trung tâm Thị trấn Quỳnh Côi",
    schedule: "Họp hàng ngày (5:00–12:00); phiên chính các ngày 2, 7 âm lịch", featured: true, verified: true,
    description: "Chợ trung tâm huyện — đầu mối nông sản, thực phẩm, hàng tiêu dùng lớn nhất Quỳnh Phụ." }),
  add({ slug: "cho-do", name: "Chợ Đọ", category: "cho-phien", wardSlug: "quynh-hong", address: "Xã Quỳnh Hồng",
    schedule: "Phiên các ngày 3, 8 âm lịch", verified: true, description: "Chợ phiên truyền thống, nổi tiếng nông sản và gia cầm." }),
  add({ slug: "cho-an-bai", name: "Chợ An Bài", category: "cho-phien", wardSlug: "an-bai", address: "Thị trấn An Bài, ven Quốc lộ 10",
    schedule: "Họp hàng ngày; phiên chính các ngày 1, 6 âm lịch", verified: true, description: "Chợ thị trấn An Bài, thuận tiện giao thương ven Quốc lộ 10." }),
  add({ slug: "cho-quynh-ngoc", name: "Chợ Quỳnh Ngọc", category: "cho-phien", wardSlug: "quynh-ngoc",
    schedule: "Phiên các ngày 4, 9 âm lịch", description: "Chợ phiên xã Quỳnh Ngọc." }),
  add({ slug: "cho-an-vu", name: "Chợ An Vũ", category: "cho-phien", wardSlug: "an-vu", address: "Ven Quốc lộ 10",
    schedule: "Phiên các ngày 5, 10 âm lịch", description: "Chợ phiên xã An Vũ." }),

  // ── Đặc sản ──
  add({ slug: "banh-cay", name: "Bánh cáy", category: "dac-san", wardSlug: "quynh-coi", priceText: "60.000đ", unit: "hộp",
    featured: true, verified: true, description: "Đặc sản Thái Bình — bánh cáy thơm bùi từ nếp, gấc, lạc, vừng; quà biếu phổ biến." }),
  add({ slug: "gao-que-quynh-phu", name: "Gạo quê Quỳnh Phụ", category: "dac-san", wardSlug: "quynh-coi", priceText: "18.000–22.000đ", unit: "kg",
    verified: true, description: "Gạo từ vùng lúa Quỳnh Phụ, hạt dẻo thơm, canh tác theo mùa vụ địa phương." }),
  add({ slug: "trung-vit-loi", name: "Trứng vịt lộn Quỳnh Phụ", category: "dac-san", wardSlug: "quynh-hai", priceText: "5.000đ", unit: "quả",
    description: "Trứng vịt lộn nuôi thả đồng, được ưa chuộng tại các chợ trong huyện." }),
  add({ slug: "rau-mau-an-toan", name: "Rau màu an toàn", category: "dac-san", wardSlug: "an-ninh", priceText: "Theo mùa", unit: "kg",
    description: "Rau màu canh tác an toàn (cải, bắp cải, su hào, hành) từ vùng chuyên canh." }),

  // ── Rao vặt ──
  add({ slug: "ban-thoc-giong-quynh-phu", name: "Bán thóc giống vụ mùa", category: "rao-vat", wardSlug: "quynh-coi",
    priceText: "Thoả thuận", contactName: "Anh Hùng", contactPhone: "0912 345 678",
    description: "Cung cấp thóc giống chất lượng cho vụ mùa tại địa bàn Quỳnh Phụ — liên hệ trực tiếp để biết chi tiết." }),
];

export function seedDocs() {
  const now = new Date();
  return ITEMS.map((s) => ({ ...s, createdAt: now, updatedAt: now }));
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const col = client.db(dbName).collection<MarketDoc>("market");
    await col.createIndex({ slug: 1 }, { unique: true });
    await col.createIndex({ category: 1, wardSlug: 1 });
    await col.createIndex({ name: "text", description: "text" }, { default_language: "none" });
    await col.deleteMany({});
    const now = new Date();
    await col.insertMany(ITEMS.map((s) => ({ ...s, createdAt: now, updatedAt: now })));
    const cnt = (c: string) => ITEMS.filter((i) => i.category === c).length;
    console.log(`✓ Chợ phiên : ${cnt("cho-phien")}`);
    console.log(`✓ Đặc sản   : ${cnt("dac-san")}`);
    console.log(`✓ Rao vặt   : ${cnt("rao-vat")}`);
    console.log(`\n✅ Đã seed ${ITEMS.length} mục chợ & mua bán vào "${dbName}".`);
  } finally {
    await client.close();
  }
}
if (isCli(import.meta.url)) main().catch((e) => { console.error("❌ Seed thất bại:", e); process.exit(1); });
