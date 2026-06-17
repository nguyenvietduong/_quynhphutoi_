// Seed tin Mua bán demo. Idempotent: upsert theo slug + prune.
// Chạy: npm run seed:classifieds
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import type { ClassifiedDoc } from "../lib/classifieds";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "quynhphu";
// Nhãn danh mục denormalize vào bản ghi seed (khớp slug module "mua-ban").
const CLABEL: Record<string, string> = {
  "xe-co": "Xe cộ", "bat-dong-san": "Nhà đất", "dien-tu": "Điện tử - Điện máy",
  "do-gia-dung": "Đồ gia dụng - Nội thất", "nong-san-vat-nuoi": "Nông sản - Vật nuôi",
  "thoi-trang": "Thời trang - Mẹ & bé", "khac": "Đồ khác",
};

type Seed = {
  slug: string; title: string; category: string; description: string;
  priceText: string; condition?: string; wardSlug: string; address?: string;
  contact: { name: string; phone: string }; approved: boolean; featured?: boolean; daysAgo: number;
  images: string[];
};

// Ảnh thật theo chủ đề (loremflickr trả ảnh Flickr khớp từ khoá, ?lock cố định để mỗi lần seed ra cùng ảnh).
const img = (kw: string, ...locks: number[]) => locks.map((l) => `https://loremflickr.com/800/600/${kw}?lock=${l}`);

const ADS: Seed[] = [
  { slug: "ban-xe-may-honda-wave", title: "Bán xe máy Honda Wave Alpha 2019", category: "xe-co",
    description: "<p>Xe Wave Alpha đời 2019, máy êm, lốp còn tốt, giấy tờ đầy đủ chính chủ. Đã đi 18.000km. Bao test máy.</p>",
    priceText: "8.500.000đ", condition: "da-dung", wardSlug: "quynh-coi", address: "Thị trấn Quỳnh Côi",
    contact: { name: "Anh Hùng", phone: "0912345678" }, approved: true, featured: true, daysAgo: 1,
    images: img("motorbike", 11, 12, 13) },
  { slug: "cho-thue-ki-ot-cho-quynh-coi", title: "Cho thuê ki-ốt chợ Quỳnh Côi", category: "bat-dong-san",
    description: "<p>Ki-ốt mặt tiền trong chợ Quỳnh Côi, diện tích ~12m², phù hợp bán quần áo, tạp hoá, đồ ăn. Đông người qua lại.</p>",
    priceText: "2.500.000đ/tháng", wardSlug: "quynh-coi", address: "Trong chợ Quỳnh Côi",
    contact: { name: "Chị Mai", phone: "0987222333" }, approved: true, daysAgo: 2,
    images: img("market", 21, 22) },
  { slug: "ban-be-bo-giong", title: "Bán bê, bò giống khỏe mạnh", category: "nong-san-vat-nuoi",
    description: "<p>Bán bê và bò giống đã tiêm phòng đầy đủ, khỏe mạnh, ăn tốt. Liên hệ xem trực tiếp tại chuồng.</p>",
    priceText: "Thỏa thuận", wardSlug: "an-thanh", contact: { name: "Bác Tâm", phone: "0934555777" }, approved: true, daysAgo: 3,
    images: img("cattle", 31, 32) },
  { slug: "ban-tu-lanh-cu", title: "Bán tủ lạnh Toshiba 180L", category: "dien-tu",
    description: "<p>Tủ lạnh Toshiba 180L còn chạy tốt, lạnh sâu, ít hao điện. Thanh lý do chuyển nhà.</p>",
    priceText: "1.800.000đ", condition: "da-dung", wardSlug: "an-bai", contact: { name: "Anh Nam", phone: "0978111222" }, approved: true, daysAgo: 1,
    images: img("refrigerator", 41, 42) },
  { slug: "ban-bo-ban-ghe-go", title: "Bộ bàn ghế gỗ phòng khách", category: "do-gia-dung",
    description: "<p>Bộ bàn ghế gỗ tự nhiên, chạm khắc đẹp, dùng 2 năm còn mới. Gồm 1 bàn + 4 ghế + 1 đôn.</p>",
    priceText: "6.000.000đ", condition: "da-dung", wardSlug: "quynh-hong", contact: { name: "Chị Lan", phone: "0905333444" }, approved: true, daysAgo: 4,
    images: img("furniture", 51, 52, 53) },
  { slug: "ban-gao-st25", title: "Gạo ST25 mới xát, bao 25kg", category: "nong-san-vat-nuoi",
    description: "<p>Gạo ST25 mới xát, thơm dẻo, đóng bao 25kg. Giao tận nhà trong huyện. Số lượng lớn có giá tốt.</p>",
    priceText: "550.000đ/bao", condition: "moi", wardSlug: "quynh-ngoc", contact: { name: "Anh Khánh", phone: "0916777888" }, approved: true, daysAgo: 0,
    images: img("grain", 61, 62) },
  { slug: "thanh-ly-quan-ao-tre-em", title: "Thanh lý quần áo trẻ em", category: "thoi-trang",
    description: "<p>Thanh lý lô quần áo trẻ em 1–6 tuổi, còn mới 90%, sạch sẽ. Bán theo set giá rẻ.</p>",
    priceText: "Từ 20.000đ", condition: "da-dung", wardSlug: "quynh-coi", contact: { name: "Mẹ Bống", phone: "0934000111" }, approved: true, daysAgo: 2,
    images: img("clothing", 71, 72) },
  { slug: "ban-iphone-12", title: "Bán iPhone 12 64GB", category: "dien-tu",
    description: "<p>iPhone 12 64GB màu xanh, pin 86%, máy đẹp không trầy. Full chức năng, kèm sạc.</p>",
    priceText: "6.500.000đ", condition: "da-dung", wardSlug: "an-vu", contact: { name: "Anh Tuấn", phone: "0909888777" }, approved: false, daysAgo: 0,
    images: img("smartphone", 81, 82, 83) },
];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    const usersCol = db.collection("users");
    const col = db.collection<ClassifiedDoc>("classifieds");
    await col.createIndex({ slug: 1 }, { unique: true });
    await col.createIndex({ category: 1, status: 1, createdAt: -1 });
    await col.createIndex({ "location.wardSlug": 1, createdAt: -1 });
    await col.createIndex({ postedBy: 1, createdAt: -1 });
    await col.createIndex({ title: "text", description: "text" }, { default_language: "none" });

    let poster = await usersCol.findOne({});
    if (!poster) {
      const passwordHash = await bcrypt.hash("123456", 10);
      const res = await usersCol.insertOne({ email: "demo@quynhphu.vn", name: "Người dân Quỳnh Phụ", passwordHash, verified: true, createdAt: new Date() });
      poster = await usersCol.findOne({ _id: res.insertedId });
    }
    const postedBy = poster!._id!; const postedByName = poster!.name;

    const seen: string[] = [];
    for (const a of ADS) {
      const created = new Date(Date.now() - a.daysAgo * 86400000);
      const fields: Omit<ClassifiedDoc, "_id" | "createdAt"> = {
        slug: a.slug, title: a.title, category: a.category, categoryLabel: CLABEL[a.category],
        description: a.description, priceText: a.priceText, condition: a.condition,
        images: a.images,
        location: { wardSlug: a.wardSlug, address: a.address },
        contact: a.contact, postedBy, postedByName,
        status: "open", approved: a.approved, verified: a.approved, featured: !!a.featured,
        views: 0, active: true, updatedAt: new Date(), soldAt: null,
      };
      await col.updateOne({ slug: a.slug }, { $set: fields, $setOnInsert: { createdAt: created } }, { upsert: true });
      seen.push(a.slug);
    }
    const pruned = await col.deleteMany({ slug: { $nin: seen } });
    console.log(`✓ Tin mua bán : ${ADS.length} (duyệt ${ADS.filter((a) => a.approved).length}, chờ ${ADS.filter((a) => !a.approved).length})`);
    if (pruned.deletedCount) console.log(`  (dọn ${pruned.deletedCount} tin cũ)`);
    console.log(`✅ Đã seed vào "${dbName}".`);
  } finally {
    await client.close();
  }
}
main().catch((e) => { console.error("❌ Seed thất bại:", e); process.exit(1); });
