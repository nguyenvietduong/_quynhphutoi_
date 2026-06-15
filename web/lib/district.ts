// Hồ sơ tổng quan xã Quỳnh Phụ — 1 document duy nhất (collection "district").
// Dữ liệu mô tả (địa lý, lịch sử, kinh tế, văn hoá) lấy từ DB thay vì hard-code.
import { getDb, ensureIndexes } from "@/lib/db";

export const DISTRICT_KEY = "quynh-phu";

export type DistrictBorder = { dir: string; desc: string };     // hướng giáp ranh
export type DistrictSection = { title: string; body: string };  // đoạn giới thiệu theo mục
export type DistrictStat = { value: string; unit: string; label: string };

export type DistrictDoc = {
  _id?: import("mongodb").ObjectId;
  key: string;                  // "quynh-phu" — duy nhất

  name: string;                 // "Quỳnh Phụ"
  fullName: string;             // "Xã Quỳnh Phụ"
  province: string;             // tỉnh (trước sáp nhập)
  region: string;               // vùng
  established?: string;         // lịch sử thành lập (1 câu)

  area: number;                 // km²
  areaText?: string;            // hiển thị (vd "209,6")
  population: number;           // người
  populationText?: string;      // hiển thị (vd "≈ 244.000")
  populationYear?: number;      // năm thống kê

  capital?: string;             // huyện lỵ
  townships: string[];          // thị trấn
  rivers?: string[];            // sông chính
  highways?: string[];          // tuyến giao thông chính

  borders: DistrictBorder[];    // giáp ranh 4 hướng
  sections: DistrictSection[];  // các mục giới thiệu
  highlights: DistrictStat[];   // số liệu nổi bật
  specialties?: string[];       // đặc sản / điểm nhấn

  source?: string;              // ghi chú nguồn
  createdAt: Date;
  updatedAt: Date;
};

export async function districtCol() {
  const db = await getDb();
  const col = db.collection<DistrictDoc>("district");
  await ensureIndexes("district", () => col.createIndex({ key: 1 }, { unique: true }));
  return col;
}

// Lấy hồ sơ huyện (mặc định Quỳnh Phụ).
export async function getDistrict(key: string = DISTRICT_KEY) {
  return (await districtCol()).findOne({ key });
}
