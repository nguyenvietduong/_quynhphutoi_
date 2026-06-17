// Seed danh bạ cơ sở y tế huyện Quỳnh Phụ — CHUẨN HÓA: chỉ lưu wardSlug (FK admin_units).
// Idempotent: xóa sạch rồi insert lại. Chạy: npm run seed:health
import { MongoClient } from "mongodb";
import { isCli } from "./_cli";
import type { HealthDoc } from "../lib/health";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "quynhphu";

// typeLabel denormalize — khớp slug danh mục module "y-te" (xem seeds/categories.ts).
const TLABEL: Record<string, string> = {
  "benh-vien": "Bệnh viện", "trung-tam-y-te": "Trung tâm y tế",
  "phong-kham": "Phòng khám", "tram-y-te": "Trạm y tế", "nha-thuoc": "Nhà thuốc",
};

// 35 đơn vị: [wardSlug, tên đầy đủ] — để đặt tên trạm y tế.
const WARDS: [string, string][] = [
  ["quynh-coi", "Thị trấn Quỳnh Côi"], ["an-bai", "Thị trấn An Bài"],
  ["an-ap", "Xã An Ấp"], ["an-cau", "Xã An Cầu"], ["an-dong", "Xã An Đồng"], ["an-duc", "Xã An Dục"],
  ["an-hiep", "Xã An Hiệp"], ["an-khe", "Xã An Khê"], ["an-le", "Xã An Lễ"], ["an-my", "Xã An Mỹ"],
  ["an-ninh", "Xã An Ninh"], ["an-quy", "Xã An Quý"], ["an-thai", "Xã An Thái"], ["an-thanh", "Xã An Thanh"],
  ["an-trang", "Xã An Tràng"], ["an-vinh", "Xã An Vinh"], ["an-vu", "Xã An Vũ"], ["dong-hai", "Xã Đông Hải"],
  ["dong-tien", "Xã Đồng Tiến"], ["quynh-giao", "Xã Quỳnh Giao"], ["quynh-hai", "Xã Quỳnh Hải"],
  ["quynh-hoa", "Xã Quỳnh Hoa"], ["quynh-hoang", "Xã Quỳnh Hoàng"], ["quynh-hoi", "Xã Quỳnh Hội"],
  ["quynh-hong", "Xã Quỳnh Hồng"], ["quynh-hung", "Xã Quỳnh Hưng"], ["quynh-khe", "Xã Quỳnh Khê"],
  ["quynh-lam", "Xã Quỳnh Lâm"], ["quynh-minh", "Xã Quỳnh Minh"], ["quynh-my", "Xã Quỳnh Mỹ"],
  ["quynh-ngoc", "Xã Quỳnh Ngọc"], ["quynh-nguyen", "Xã Quỳnh Nguyên"], ["quynh-tho", "Xã Quỳnh Thọ"],
  ["chau-son", "Xã Châu Sơn"], ["trang-bao-xa", "Xã Trang Bảo Xá"],
];

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

type Seed = Omit<HealthDoc, "_id" | "createdAt" | "updatedAt">;
const out: Seed[] = [];
const add = (s: Partial<Seed> & Pick<Seed, "slug" | "name" | "type" | "wardSlug">) =>
  out.push({ ownership: "cong-lap", typeLabel: TLABEL[s.type], verified: false, active: true, ...s });

// Tuyến huyện
add({
  slug: "benh-vien-da-khoa-quynh-phu", name: "Bệnh viện Đa khoa huyện Quỳnh Phụ", shortName: "BVĐK Quỳnh Phụ",
  type: "benh-vien", ownership: "cong-lap", wardSlug: "quynh-coi", address: "Thị trấn Quỳnh Côi",
  phone: "0227 3861 234", hours: "Cấp cứu 24/7", emergency: true, beds: 320,
  specialties: "Nội, Ngoại, Sản, Nhi, Đông y, Truyền nhiễm", foundedYear: 1965,
  description: "Bệnh viện đa khoa hạng II tuyến huyện, quy mô ~320 giường, có khoa cấp cứu trực 24/7.",
  verified: true,
});
add({
  slug: "trung-tam-y-te-quynh-phu", name: "Trung tâm Y tế huyện Quỳnh Phụ", shortName: "TTYT Quỳnh Phụ",
  type: "trung-tam-y-te", ownership: "cong-lap", wardSlug: "quynh-coi", address: "Thị trấn Quỳnh Côi",
  phone: "0227 3861 115", hours: "7:00–17:00 (T2–T6)", specialties: "Y tế dự phòng, tiêm chủng, an toàn thực phẩm",
  description: "Trung tâm Y tế huyện: y tế dự phòng, tiêm chủng mở rộng, phòng chống dịch, quản lý các trạm y tế xã.",
  verified: true,
});

// 35 trạm y tế xã/thị trấn
for (const [ws, name] of WARDS) {
  const unitShort = name.replace(/^(Thị trấn|Xã)\s+/, "");
  add({
    slug: `tram-y-te-${slugify(unitShort)}`,
    name: `Trạm Y tế ${name}`,
    type: "tram-y-te", ownership: "cong-lap", wardSlug: ws,
    hours: "7:00–11:30, 13:30–17:00", emergency: false,
    description: `Trạm Y tế ${name} — khám chữa bệnh ban đầu, tiêm chủng, chăm sóc sức khỏe cộng đồng tại địa phương.`,
  });
}

// Phòng khám & nhà thuốc (tư nhân) ở thị trấn
add({ slug: "phong-kham-da-khoa-an-binh", name: "Phòng khám Đa khoa An Bình", type: "phong-kham", ownership: "tu-nhan",
  wardSlug: "quynh-coi", address: "Khu 4, Thị trấn Quỳnh Côi", phone: "0915 222 333", hours: "7:30–20:00",
  specialties: "Nội tổng quát, Siêu âm, Xét nghiệm", verified: true,
  description: "Phòng khám đa khoa tư nhân, khám ngoài giờ, có siêu âm và xét nghiệm cơ bản." });
add({ slug: "phong-kham-nhi-an-bai", name: "Phòng khám Nhi An Bài", type: "phong-kham", ownership: "tu-nhan",
  wardSlug: "an-bai", address: "Quốc lộ 10, Thị trấn An Bài", phone: "0987 444 555", hours: "16:30–21:00",
  specialties: "Nhi khoa", description: "Phòng khám chuyên khoa Nhi, khám ngoài giờ hành chính." });
add({ slug: "nha-thuoc-quynh-coi", name: "Nhà thuốc Quỳnh Côi", type: "nha-thuoc", ownership: "tu-nhan",
  wardSlug: "quynh-coi", address: "Chợ Quỳnh Côi", phone: "0912 666 777", hours: "7:00–21:30",
  description: "Nhà thuốc đạt chuẩn GPP, cung cấp thuốc và tư vấn dược tại trung tâm thị trấn." });
add({ slug: "nha-thuoc-an-bai", name: "Nhà thuốc An Bài", type: "nha-thuoc", ownership: "tu-nhan",
  wardSlug: "an-bai", address: "Quốc lộ 10, Thị trấn An Bài", phone: "0934 888 999", hours: "7:00–21:00",
  description: "Nhà thuốc đạt chuẩn GPP tại thị trấn An Bài." });

export function seedDocs() {
  const now = new Date();
  return out.map((s) => ({ ...s, createdAt: now, updatedAt: now }));
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const col = client.db(dbName).collection<HealthDoc>("health");
    await col.createIndex({ slug: 1 }, { unique: true });
    await col.createIndex({ type: 1, wardSlug: 1 });
    await col.createIndex({ name: "text" }, { default_language: "none" });

    await col.deleteMany({});
    const now = new Date();
    await col.insertMany(out.map((s) => ({ ...s, createdAt: now, updatedAt: now })));

    const cnt = (t: string) => out.filter((s) => s.type === t).length;
    console.log(`✓ Bệnh viện       : ${cnt("benh-vien")}`);
    console.log(`✓ Trung tâm y tế  : ${cnt("trung-tam-y-te")}`);
    console.log(`✓ Phòng khám      : ${cnt("phong-kham")}`);
    console.log(`✓ Trạm y tế       : ${cnt("tram-y-te")}`);
    console.log(`✓ Nhà thuốc       : ${cnt("nha-thuoc")}`);
    console.log(`\n✅ Đã seed ${out.length} cơ sở y tế vào "${dbName}".`);
  } finally {
    await client.close();
  }
}
if (isCli(import.meta.url)) main().catch((e) => { console.error("❌ Seed thất bại:", e); process.exit(1); });
