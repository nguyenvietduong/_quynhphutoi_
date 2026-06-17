// Seed Di tích lịch sử - văn hoá Quỳnh Phụ. Xóa sạch + insert lại.
// Chạy: npm run seed:relics
import { MongoClient } from "mongodb";
import { isCli } from "./_cli";
import type { RelicDoc } from "../lib/relics";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "quynhphu";
// Nhãn loại khớp danh mục module "di-tich" (chỉ để denormalize khi seed).
const TLABEL: Record<string, string> = { den: "Đền", chua: "Chùa", dinh: "Đình", mieu: "Miếu", "nha-tho": "Nhà thờ", khac: "Khác" };

// Ảnh thật theo chủ đề (loremflickr, ?lock cố định để seed ổn định).
const img = (kw: string, ...locks: number[]) => locks.map((l) => `https://loremflickr.com/800/600/${kw}?lock=${l}`);

type Seed = Omit<RelicDoc, "_id" | "createdAt" | "updatedAt">;
const add = (s: Partial<Seed> & Pick<Seed, "slug" | "name" | "type" | "wardSlug" | "images">): Seed =>
  ({ typeLabel: TLABEL[s.type], verified: false, featured: false, active: true, ...s });

const ITEMS: Seed[] = [
  add({
    slug: "den-dong-bang", name: "Đền Đồng Bằng", type: "den", wardSlug: "dong-bang", address: "Làng Đồng Bằng",
    ranking: "quoc-gia", recognizedYear: 1986, era: "Khởi dựng từ thời Hùng Vương, trùng tu lớn thời Lê - Nguyễn",
    worship: "Đức Vua Cha Bát Hải Động Đình", festival: "Lễ hội đền Đồng Bằng 20–26 tháng 8 âm lịch",
    featured: true, verified: true, images: img("temple", 301, 302, 303),
    description: "Một trong những ngôi đền cổ kính, linh thiêng bậc nhất vùng đồng bằng Bắc Bộ, thờ Đức Vua Cha Bát Hải Động Đình. Quần thể kiến trúc gỗ đồ sộ với nhiều mảng chạm khắc tinh xảo; lễ hội tháng 8 âm lịch thu hút đông đảo du khách thập phương.",
  }),
  add({
    slug: "den-a-sao", name: "Đền A Sào", type: "den", wardSlug: "a-sao", address: "Khu di tích A Sào",
    ranking: "quoc-gia", recognizedYear: 2011, era: "Thời Trần (thế kỷ XIII)",
    worship: "Hưng Đạo Đại Vương Trần Quốc Tuấn", festival: "Lễ hội A Sào mùng 10 tháng 2 âm lịch",
    featured: true, verified: true, images: img("temple", 311, 312, 313),
    description: "Di tích gắn với Hưng Đạo Đại Vương Trần Quốc Tuấn và cuộc kháng chiến chống Nguyên Mông. Vùng đất A Sào từng là kho lương, bãi luyện quân của nhà Trần; nơi đây còn lưu truyền sự tích voi chiến và tượng đài Trần Hưng Đạo uy nghi.",
  }),
  add({
    slug: "chua-quynh-coi", name: "Chùa Quỳnh Côi", type: "chua", wardSlug: "quynh-coi", address: "Thị trấn Quỳnh Côi",
    ranking: "cap-tinh", era: "Thời Hậu Lê", worship: "Thờ Phật", festival: "Lễ Phật đản, Vu Lan",
    verified: true, images: img("pagoda", 321, 322),
    description: "Ngôi chùa cổ ở trung tâm thị trấn Quỳnh Côi, không gian tĩnh lặng với tam quan, gác chuông và vườn tháp; là nơi sinh hoạt tín ngưỡng của nhân dân trong vùng.",
  }),
  add({
    slug: "dinh-an-vu", name: "Đình An Vũ", type: "dinh", wardSlug: "an-vu", address: "Xã An Vũ",
    ranking: "cap-tinh", era: "Thời Nguyễn (thế kỷ XIX)", worship: "Thành hoàng làng", festival: "Hội làng đầu xuân",
    images: img("architecture", 331, 332),
    description: "Đình làng truyền thống thờ Thành hoàng, nơi diễn ra hội làng và các sinh hoạt cộng đồng. Kiến trúc gỗ ba gian hai chái với nhiều bức cốn, đầu dư chạm khắc công phu.",
  }),
  add({
    slug: "den-quynh-hoa", name: "Đền Quỳnh Hoa", type: "den", wardSlug: "quynh-hoa", address: "Xã Quỳnh Hoa",
    ranking: "kiem-ke", era: "Thời Lê", worship: "Các vị tiền hiền có công khai khẩn",
    images: img("shrine", 341, 342),
    description: "Đền thờ các bậc tiền hiền có công lập ấp, khai khẩn vùng đất Quỳnh Hoa; được nhân dân gìn giữ, hương khói quanh năm.",
  }),
  add({
    slug: "mieu-quynh-hong", name: "Miếu Quỳnh Hồng", type: "mieu", wardSlug: "quynh-hong", address: "Xã Quỳnh Hồng",
    era: "Không rõ niên đại", worship: "Thần Nông và các vị thần bản thổ",
    images: img("shrine", 351, 352),
    description: "Ngôi miếu nhỏ gắn với tín ngưỡng nông nghiệp của làng quê Quỳnh Hồng, là điểm tựa tâm linh cầu mưa thuận gió hoà.",
  }),
  add({
    slug: "chua-an-bai", name: "Chùa An Bài", type: "chua", wardSlug: "an-bai", address: "Thị trấn An Bài",
    ranking: "kiem-ke", era: "Thời Nguyễn", worship: "Thờ Phật", festival: "Lễ Vu Lan rằm tháng 7",
    images: img("pagoda", 361, 362),
    description: "Chùa nằm ven Quốc lộ 10, là nơi tu học và sinh hoạt Phật giáo của bà con thị trấn An Bài và các xã lân cận.",
  }),
  add({
    slug: "nha-tho-quynh-ngoc", name: "Nhà thờ giáo xứ Quỳnh Ngọc", type: "nha-tho", wardSlug: "quynh-ngoc", address: "Xã Quỳnh Ngọc",
    era: "Đầu thế kỷ XX", worship: "Công giáo", festival: "Lễ Giáng sinh, Phục sinh",
    images: img("church", 371, 372),
    description: "Nhà thờ mang phong cách kiến trúc Gothic với tháp chuông cao, là trung tâm sinh hoạt của cộng đồng giáo dân địa phương.",
  }),
  add({
    slug: "tu-duong-dong-ho-nguyen", name: "Từ đường dòng họ Nguyễn", type: "khac", wardSlug: "quynh-coi", address: "Thị trấn Quỳnh Côi",
    era: "Thời Nguyễn", worship: "Tổ tiên dòng họ Nguyễn",
    images: img("architecture", 381, 382),
    description: "Từ đường thờ tổ tiên dòng họ Nguyễn — công trình tín ngưỡng dòng họ tiêu biểu, nơi con cháu hội tụ dịp giỗ tổ và lễ tết.",
  }),
];

export function seedDocs() {
  const now = new Date();
  return ITEMS.map((s) => ({ ...s, createdAt: now, updatedAt: now }));
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const col = client.db(dbName).collection<RelicDoc>("relics");
    await col.createIndex({ slug: 1 }, { unique: true });
    await col.createIndex({ type: 1, wardSlug: 1 });
    await col.createIndex({ name: "text", description: "text" }, { default_language: "none" });
    await col.deleteMany({});
    const now = new Date();
    await col.insertMany(ITEMS.map((s) => ({ ...s, createdAt: now, updatedAt: now })));
    const cnt = (t: string) => ITEMS.filter((i) => i.type === t).length;
    console.log(`✓ Đền   : ${cnt("den")}`);
    console.log(`✓ Chùa  : ${cnt("chua")}`);
    console.log(`✓ Đình  : ${cnt("dinh")}`);
    console.log(`✓ Miếu  : ${cnt("mieu")}`);
    console.log(`✓ Nhà thờ: ${cnt("nha-tho")}`);
    console.log(`✓ Quốc gia: ${ITEMS.filter((i) => i.ranking === "quoc-gia").length}`);
    console.log(`\n✅ Đã seed ${ITEMS.length} di tích vào "${dbName}".`);
  } finally {
    await client.close();
  }
}
if (isCli(import.meta.url)) main().catch((e) => { console.error("❌ Seed thất bại:", e); process.exit(1); });
