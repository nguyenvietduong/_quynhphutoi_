// Seed danh bạ trường học huyện Quỳnh Phụ — CHUẨN HÓA địa chỉ:
// trường CHỈ lưu khóa ngoại `wardSlug` (+ `address` đường, tùy chọn). Tên xã/huyện/
// tỉnh/xã mới nằm ở bảng `admin_units` (seed: npm run seed:admin-units).
//
// Mô hình: nhiều xã GỘP Tiểu học + THCS thành trường liên cấp "TH&THCS"
// (levels = ["tieu-hoc","thcs"]); một số xã vẫn tách riêng TH và THCS.
// 2 xã sáp nhập (Châu Sơn, Trang Bảo Xá) còn nhiều trường mang tên xã cũ.
//
// Idempotent: xóa sạch rồi insert lại (đổi schema → reinsert cho gọn).
// Chạy: npm run seed:schools

import { MongoClient } from "mongodb";
import type { SchoolDoc } from "../lib/schools"; // chỉ lấy kiểu
import { isCli } from "./_cli";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "quynhphu";

function slugify(s: string) {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-");
}

type SeedSchool = Omit<SchoolDoc, "_id" | "createdAt" | "updatedAt">;
const out: SeedSchool[] = [];

function add(s: Partial<SeedSchool> & Pick<SeedSchool, "slug" | "name" | "level" | "levels" | "wardSlug">) {
  out.push({
    type: "cong-lap",
    levelLabel:
      s.level === "mam-non" ? "Mầm non" :
      s.level === "tieu-hoc" ? "Tiểu học" :
      s.level === "thcs" ? "Trung học cơ sở" : "Trung học phổ thông",
    verified: false,
    active: true,
    ...s,
  });
}

// Helpers sinh trường theo tên + wardSlug (KHÔNG lưu tên xã — đã ở admin_units).
const mn = (base: string, wardSlug: string, verified: boolean) =>
  add({ slug: `mam-non-${slugify(base)}`, name: `Trường Mầm non ${base}`, level: "mam-non", levels: ["mam-non"], wardSlug, verified });
const th = (base: string, wardSlug: string, verified: boolean) =>
  add({ slug: `tieu-hoc-${slugify(base)}`, name: `Trường Tiểu học ${base}`, level: "tieu-hoc", levels: ["tieu-hoc"], wardSlug, verified });
const thcs = (base: string, wardSlug: string, verified: boolean) =>
  add({ slug: `thcs-${slugify(base)}`, name: `Trường THCS ${base}`, level: "thcs", levels: ["thcs"], wardSlug, verified });
const thths = (base: string, wardSlug: string, verified: boolean) =>
  add({ slug: `th-thcs-${slugify(base)}`, name: `Trường TH&THCS ${base}`, level: "thcs", levels: ["tieu-hoc", "thcs"], wardSlug, verified });

type Cfg = { name: string; prefix: "Thị trấn" | "Xã"; mode: "sep" | "comb"; vTH?: boolean; vTHCS?: boolean; vC?: boolean; vMN?: boolean };

const UNITS: Cfg[] = [
  { name: "Quỳnh Côi", prefix: "Thị trấn", mode: "sep", vTH: true, vTHCS: true, vMN: true },
  { name: "An Bài", prefix: "Thị trấn", mode: "sep", vTH: true, vTHCS: false, vMN: true },
  { name: "An Ấp", prefix: "Xã", mode: "sep", vTH: false, vTHCS: true, vMN: true },
  { name: "An Cầu", prefix: "Xã", mode: "comb", vC: true, vMN: true },
  { name: "An Đồng", prefix: "Xã", mode: "sep", vTH: true, vTHCS: false, vMN: false },
  { name: "An Dục", prefix: "Xã", mode: "comb", vC: false, vMN: true },
  { name: "An Hiệp", prefix: "Xã", mode: "comb", vC: true, vMN: true },
  { name: "An Khê", prefix: "Xã", mode: "sep", vTH: true, vTHCS: false, vMN: false },
  { name: "An Lễ", prefix: "Xã", mode: "sep", vTH: false, vTHCS: true, vMN: true },
  { name: "An Mỹ", prefix: "Xã", mode: "sep", vTH: true, vTHCS: true, vMN: false },
  { name: "An Ninh", prefix: "Xã", mode: "sep", vTH: true, vTHCS: false, vMN: true },
  { name: "An Quý", prefix: "Xã", mode: "comb", vC: false, vMN: false },
  { name: "An Thái", prefix: "Xã", mode: "comb", vC: true, vMN: true },
  { name: "An Thanh", prefix: "Xã", mode: "comb", vC: false, vMN: true },
  { name: "An Tràng", prefix: "Xã", mode: "comb", vC: false, vMN: true },
  { name: "An Vinh", prefix: "Xã", mode: "sep", vTH: false, vTHCS: false, vMN: false },
  { name: "An Vũ", prefix: "Xã", mode: "comb", vC: true, vMN: true },
  { name: "Đông Hải", prefix: "Xã", mode: "sep", vTH: true, vTHCS: true, vMN: false },
  { name: "Đồng Tiến", prefix: "Xã", mode: "sep", vTH: true, vTHCS: true, vMN: false },
  { name: "Quỳnh Giao", prefix: "Xã", mode: "comb", vC: true, vMN: false },
  { name: "Quỳnh Hải", prefix: "Xã", mode: "sep", vTH: true, vTHCS: false, vMN: false },
  { name: "Quỳnh Hoa", prefix: "Xã", mode: "comb", vC: false, vMN: false },
  { name: "Quỳnh Hoàng", prefix: "Xã", mode: "comb", vC: false, vMN: false },
  { name: "Quỳnh Hội", prefix: "Xã", mode: "sep", vTH: true, vTHCS: true, vMN: false },
  { name: "Quỳnh Hồng", prefix: "Xã", mode: "sep", vTH: true, vTHCS: true, vMN: true },
  { name: "Quỳnh Hưng", prefix: "Xã", mode: "comb", vC: true, vMN: false },
  { name: "Quỳnh Khê", prefix: "Xã", mode: "comb", vC: false, vMN: false },
  { name: "Quỳnh Lâm", prefix: "Xã", mode: "comb", vC: false, vMN: true },
  { name: "Quỳnh Minh", prefix: "Xã", mode: "comb", vC: true, vMN: false },
  { name: "Quỳnh Mỹ", prefix: "Xã", mode: "sep", vTH: false, vTHCS: true, vMN: false },
  { name: "Quỳnh Ngọc", prefix: "Xã", mode: "sep", vTH: true, vTHCS: true, vMN: true },
  { name: "Quỳnh Nguyên", prefix: "Xã", mode: "comb", vC: true, vMN: true },
  { name: "Quỳnh Thọ", prefix: "Xã", mode: "sep", vTH: false, vTHCS: true, vMN: true },
];

for (const u of UNITS) {
  const wardSlug = slugify(u.name);
  const base = u.prefix === "Thị trấn" ? `Thị trấn ${u.name}` : u.name;
  mn(base, wardSlug, !!u.vMN);
  if (u.mode === "sep") {
    th(base, wardSlug, !!u.vTH);
    thcs(base, wardSlug, !!u.vTHCS);
  } else {
    thths(base, wardSlug, !!u.vC);
  }
}

// 2 xã sáp nhập: còn nhiều trường mang tên xã cũ.
{
  const ws = "chau-son"; // Châu Sơn = Quỳnh Châu + Quỳnh Sơn
  thths("Quỳnh Châu", ws, true);
  thcs("Quỳnh Sơn", ws, true);
  mn("Quỳnh Châu", ws, false);
  mn("Quỳnh Sơn", ws, false);
}
{
  const ws = "trang-bao-xa"; // Trang Bảo Xá = Quỳnh Trang + Quỳnh Bảo + Quỳnh Xá
  thths("Quỳnh Trang", ws, false);
  thths("Quỳnh Bảo", ws, true);
  thths("Quỳnh Xá", ws, true);
  mn("Quỳnh Trang", ws, false);
  mn("Quỳnh Bảo", ws, false);
  mn("Quỳnh Xá", ws, false);
}

// Mầm non tư thục
add({
  slug: "mam-non-tu-thuc-quang-minh", name: "Trường Mầm non Quang Minh",
  level: "mam-non", levels: ["mam-non"], type: "tu-thuc",
  wardSlug: "quynh-coi", address: "46 Trần Hưng Đạo", verified: true,
});

// Cấp 3: 6 cơ sở (mã MOET 009–014)
add({ slug: "thpt-quynh-coi", name: "Trường THPT Quỳnh Côi", shortName: "THPT Quỳnh Côi",
  level: "thpt", levels: ["thpt"], type: "cong-lap", wardSlug: "quynh-coi", address: "Khu 3",
  website: "http://thptquynhcoi.thaibinh.edu.vn", foundedYear: 1962,
  description: "Trường THPT công lập lâu đời nhất huyện, thành lập 1962.", verified: true });
add({ slug: "thpt-quynh-tho", name: "Trường THPT Quỳnh Thọ", shortName: "THPT Quỳnh Thọ",
  level: "thpt", levels: ["thpt"], type: "cong-lap", wardSlug: "quynh-tho",
  website: "http://thptquynhtho.thaibinh.edu.vn",
  description: "Trường THPT công lập, một trong ba trường THPT công lập của huyện.", verified: true });
add({ slug: "thpt-phu-duc", name: "Trường THPT Phụ Dực", shortName: "THPT Phụ Dực",
  level: "thpt", levels: ["thpt"], type: "cong-lap", wardSlug: "an-bai", address: "Quốc lộ 10",
  website: "http://thptphuduc.thaibinh.edu.vn", foundedYear: 1965,
  description: "Trường THPT công lập tại thị trấn An Bài (vùng Phụ Dực), thành lập 1965.", verified: true });
add({ slug: "thpt-nguyen-hue", name: "Trường THPT Nguyễn Huệ", shortName: "THPT Nguyễn Huệ",
  level: "thpt", levels: ["thpt"], type: "dan-lap", wardSlug: "quynh-hung", foundedYear: 1997,
  description: "Trường THPT dân lập (tiền thân THPT Bán công Quỳnh Phụ, 1997) tại xã Quỳnh Hưng.", verified: true });
add({ slug: "thpt-tran-hung-dao", name: "Trường THPT Trần Hưng Đạo", shortName: "THPT Trần Hưng Đạo",
  level: "thpt", levels: ["thpt"], type: "dan-lap", wardSlug: "an-vu", address: "Quốc lộ 10",
  description: "Trường THPT dân lập tại xã An Vũ, ven Quốc lộ 10.", verified: true });
add({ slug: "gdnn-gdtx-quynh-phu", name: "Trung tâm GDNN-GDTX Quỳnh Phụ", shortName: "GDNN-GDTX Quỳnh Phụ",
  level: "thpt", levels: ["thpt"], type: "gdnn-gdtx", wardSlug: "quynh-coi", address: "Khu 3B",
  description: "Trung tâm Giáo dục nghề nghiệp – Giáo dục thường xuyên; dạy nghề và văn hoá GDTX cấp THPT.", verified: true });

// Doc sẵn sàng insert (dùng cho orchestrator seed-if-empty ở app).
export function seedDocs() {
  const now = new Date();
  return out.map((s) => ({ ...s, createdAt: now, updatedAt: now }));
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const col = client.db(dbName).collection<SchoolDoc>("schools");
    await col.createIndex({ slug: 1 }, { unique: true });
    await col.createIndex({ levels: 1, wardSlug: 1 });
    await col.createIndex({ wardSlug: 1, level: 1 });
    await col.createIndex({ name: "text" }, { default_language: "none" });

    // Đổi schema → xóa sạch rồi insert lại (bỏ hẳn field địa chỉ cũ).
    await col.deleteMany({});
    const now = new Date();
    await col.insertMany(out.map((s) => ({ ...s, createdAt: now, updatedAt: now })));

    const cnt = (lv: string) => out.filter((s) => s.levels.includes(lv)).length;
    const ver = out.filter((s) => s.verified).length;
    console.log(`✓ Mầm non      : ${cnt("mam-non")}`);
    console.log(`✓ Tiểu học     : ${cnt("tieu-hoc")} (gồm trường liên cấp TH&THCS)`);
    console.log(`✓ THCS         : ${cnt("thcs")} (gồm trường liên cấp TH&THCS)`);
    console.log(`✓ THPT/GDTX    : ${cnt("thpt")}`);
    console.log(`✓ Đã xác minh  : ${ver}/${out.length} trường`);
    console.log(`\n✅ Đã seed ${out.length} trường vào "${dbName}" (địa chỉ liên kết admin_units qua wardSlug).`);
  } finally {
    await client.close();
  }
}

if (isCli(import.meta.url)) main().catch((err) => { console.error("❌ Seed thất bại:", err); process.exit(1); });
