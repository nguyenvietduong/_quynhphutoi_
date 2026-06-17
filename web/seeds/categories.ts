// Seed danh mục phân cấp cho các phân hệ: Dịch vụ công, Tiện ích, Tìm đồ rơi.
// Idempotent — upsert theo (module, path), chạy lại nhiều lần không nhân đôi.
//
// Cách chạy (trong thư mục web/):
//   npm run seed:categories
// hoặc trực tiếp:
//   node --experimental-strip-types --env-file=.env.local seeds/categories.ts
//   npx tsx seeds/categories.ts
//
// File tự kết nối MongoDB (đọc MONGODB_URI / MONGODB_DB như lib/db.ts) nên
// chạy được độc lập, không cần dựng Next.

import { MongoClient, ObjectId } from "mongodb";
import type { CategoryDoc } from "../lib/categories"; // chỉ lấy kiểu — bị xoá khi chạy

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "quynhphu";

// ---- Cấu trúc seed: cây lồng nhau, chỉ cần slug + name (+ icon/href/desc) ----
type SeedNode = {
  slug: string;
  name: string;
  icon?: string;
  href?: string;          // liên kết tới trang — khớp dữ liệu navbar (lib/nav.ts)
  description?: string;
  children?: SeedNode[];
};

// prune=false: chỉ bootstrap danh mục ban đầu, KHÔNG xoá node admin thêm sau (Tin tức, Mua bán, Tìm đồ rơi).
const MODULES: { module: string; label: string; tree: SeedNode[]; prune?: boolean }[] = [
  {
    module: "dich-vu-cong",
    label: "Dịch vụ công",
    // Cấp 1 khớp NAV_TREE > "Dịch vụ công" trong lib/nav.ts (name/href/desc/icon),
    // cấp 2 mở rộng từ chính phần mô tả của mỗi mục.
    tree: [
      {
        slug: "truong-hoc", name: "Trường học", icon: "school", href: "/truong-hoc",
        description: "Trường học theo xã & cấp học",
        children: [
          { slug: "mam-non", name: "Mầm non" },
          { slug: "tieu-hoc", name: "Tiểu học" },
          { slug: "thcs", name: "Trung học cơ sở" },
          { slug: "thpt", name: "Trung học phổ thông" },
        ],
      },
      {
        slug: "y-te", name: "Y tế", icon: "health", href: "/y-te",
        description: "Bệnh viện, trạm y tế, phòng khám",
        children: [
          { slug: "benh-vien", name: "Bệnh viện" },
          { slug: "tram-y-te", name: "Trạm y tế" },
          { slug: "phong-kham", name: "Phòng khám" },
        ],
      },
      {
        slug: "giao-thong", name: "Giao thông", icon: "bus", href: "/giao-thong",
        description: "Tuyến xe, lộ trình, bến đón",
        children: [
          { slug: "tuyen-xe", name: "Tuyến xe" },
          { slug: "lo-trinh", name: "Lộ trình" },
          { slug: "ben-don", name: "Bến đón" },
        ],
      },
    ],
  },
  {
    module: "tien-ich",
    label: "Tiện ích",
    // Khớp NAV_TREE > "Tiện ích" (giao-thong đã chuyển sang Dịch vụ công như navbar).
    tree: [
      {
        slug: "viec-lam", name: "Việc làm", icon: "job", href: "/viec-lam",
        description: "Tin tuyển dụng địa phương",
        children: [
          { slug: "tuyen-dung", name: "Tin tuyển dụng" },
          { slug: "tim-viec", name: "Người tìm việc" },
        ],
      },
      {
        slug: "cho-mua-ban", name: "Chợ & Mua bán", icon: "market", href: "/cho-mua-ban",
        description: "Lịch chợ phiên, đặc sản, rao vặt",
        children: [
          { slug: "rao-vat", name: "Rao vặt" },
          { slug: "dac-san", name: "Đặc sản địa phương" },
          { slug: "lich-cho-phien", name: "Lịch chợ phiên" },
        ],
      },
    ],
  },
  {
    module: "tim-do-roi",
    label: "Tìm đồ rơi",
    tree: [
      {
        slug: "giay-to", name: "Giấy tờ tuỳ thân", icon: "id-card",
        children: [
          { slug: "cccd", name: "Căn cước công dân" },
          { slug: "giay-phep-lai-xe", name: "Giấy phép lái xe" },
          { slug: "the-bhyt", name: "Thẻ bảo hiểm y tế" },
          { slug: "giay-to-khac", name: "Giấy tờ khác" },
        ],
      },
      {
        slug: "vi-tai-san", name: "Ví & Tài sản", icon: "wallet",
        children: [
          { slug: "vi-tien", name: "Ví tiền" },
          { slug: "dien-thoai", name: "Điện thoại" },
          { slug: "trang-suc", name: "Trang sức" },
          { slug: "chia-khoa", name: "Chìa khoá" },
        ],
      },
      {
        slug: "phuong-tien", name: "Phương tiện", icon: "bike",
        children: [
          { slug: "xe-may", name: "Xe máy" },
          { slug: "xe-dap", name: "Xe đạp" },
        ],
      },
      {
        slug: "thu-cung", name: "Thú cưng", icon: "paw",
        children: [
          { slug: "cho", name: "Chó" },
          { slug: "meo", name: "Mèo" },
        ],
      },
      { slug: "khac", name: "Khác", icon: "dots" },
    ],
    prune: false,
  },
  {
    module: "tin-tuc",
    label: "Tin tức",
    prune: false, // danh mục tin tức — admin tự thêm; seed chỉ bootstrap danh mục có sẵn
    tree: [
      { slug: "thong-bao", name: "Thông báo" },
      { slug: "doi-song", name: "Đời sống" },
      { slug: "kinh-te", name: "Kinh tế" },
      { slug: "giao-duc", name: "Giáo dục" },
    ],
  },
  {
    module: "mua-ban",
    label: "Mua bán",
    prune: false, // GIỮ slug cũ để tin đã đăng không lệch danh mục; admin thêm danh mục mới
    tree: [
      { slug: "xe-co", name: "Xe cộ" },
      { slug: "bat-dong-san", name: "Nhà đất" },
      { slug: "dien-tu", name: "Điện tử - Điện máy" },
      { slug: "do-gia-dung", name: "Đồ gia dụng - Nội thất" },
      { slug: "nong-san-vat-nuoi", name: "Nông sản - Vật nuôi" },
      { slug: "thoi-trang", name: "Thời trang - Mẹ & bé" },
      { slug: "khac", name: "Đồ khác" },
    ],
  },

  // ─── Danh mục PHÂN LOẠI của các phân hệ (trước đây hardcode trong lib/*.ts).
  // Slug phải KHỚP slug đã lưu trong dữ liệu content để nhãn & bộ lọc đúng.
  // prune:false → admin tự thêm loại mới mà seed không xoá.
  {
    module: "viec-lam",
    label: "Việc làm (ngành nghề)",
    prune: false,
    tree: [
      { slug: "nong-nghiep", name: "Nông nghiệp - Thủy sản" },
      { slug: "san-xuat", name: "Sản xuất - Công nghiệp" },
      { slug: "may-mac", name: "May mặc - Da giày" },
      { slug: "co-khi-dien", name: "Cơ khí - Điện - Điện tử" },
      { slug: "xay-dung", name: "Xây dựng" },
      { slug: "kinh-doanh", name: "Bán hàng - Kinh doanh" },
      { slug: "dich-vu", name: "Dịch vụ - Nhà hàng - Khách sạn" },
      { slug: "van-tai", name: "Vận tải - Kho bãi" },
      { slug: "van-phong", name: "Hành chính - Văn phòng" },
      { slug: "ke-toan", name: "Kế toán - Tài chính" },
      { slug: "giao-duc", name: "Giáo dục - Đào tạo" },
      { slug: "y-te", name: "Y tế - Chăm sóc sức khỏe" },
      { slug: "cntt", name: "Công nghệ thông tin" },
      { slug: "lao-dong-pho-thong", name: "Lao động phổ thông" },
      { slug: "khac", name: "Ngành nghề khác" },
    ],
  },
  {
    module: "truong-hoc",
    label: "Trường học (cấp học)",
    prune: false,
    tree: [
      { slug: "mam-non", name: "Mầm non" },
      { slug: "tieu-hoc", name: "Tiểu học" },
      { slug: "thcs", name: "Trung học cơ sở" },
      { slug: "thpt", name: "Trung học phổ thông" },
    ],
  },
  {
    module: "y-te",
    label: "Y tế (loại cơ sở)",
    prune: false,
    tree: [
      { slug: "benh-vien", name: "Bệnh viện" },
      { slug: "trung-tam-y-te", name: "Trung tâm y tế" },
      { slug: "phong-kham", name: "Phòng khám" },
      { slug: "tram-y-te", name: "Trạm y tế" },
      { slug: "nha-thuoc", name: "Nhà thuốc" },
    ],
  },
  {
    module: "cho",
    label: "Chợ & Mua bán (loại)",
    prune: false,
    tree: [
      { slug: "cho-phien", name: "Chợ phiên" },
      { slug: "dac-san", name: "Đặc sản" },
      { slug: "rao-vat", name: "Rao vặt" },
    ],
  },
  {
    module: "giao-thong",
    label: "Giao thông (loại tuyến)",
    prune: false,
    tree: [
      { slug: "lien-tinh", name: "Liên tỉnh" },
      { slug: "noi-tinh", name: "Nội tỉnh" },
      { slug: "xe-buyt", name: "Xe buýt" },
    ],
  },
  {
    module: "di-tich",
    label: "Di tích (loại)",
    prune: false,
    tree: [
      { slug: "den", name: "Đền" },
      { slug: "chua", name: "Chùa" },
      { slug: "dinh", name: "Đình" },
      { slug: "mieu", name: "Miếu" },
      { slug: "nha-tho", name: "Nhà thờ" },
      { slug: "khac", name: "Khác" },
    ],
  },

  // ─── Thuộc tính trạng thái (trước là enum cố định) — nay cũng quản lý được.
  {
    module: "loai-hinh-cong-viec",
    label: "Việc làm (loại hình)",
    prune: false,
    tree: [
      { slug: "toan-thoi-gian", name: "Toàn thời gian" },
      { slug: "ban-thoi-gian", name: "Bán thời gian" },
      { slug: "thoi-vu", name: "Thời vụ" },
      { slug: "thuc-tap", name: "Thực tập" },
    ],
  },
  {
    module: "tinh-trang",
    label: "Mua bán (tình trạng)",
    prune: false,
    tree: [
      { slug: "moi", name: "Mới" },
      { slug: "da-dung", name: "Đã sử dụng" },
    ],
  },
  {
    module: "so-huu-y-te",
    label: "Y tế (loại hình sở hữu)",
    prune: false,
    tree: [
      { slug: "cong-lap", name: "Công lập" },
      { slug: "tu-nhan", name: "Tư nhân" },
    ],
  },
  {
    module: "loai-hinh-truong",
    label: "Trường học (loại hình)",
    prune: false,
    tree: [
      { slug: "cong-lap", name: "Công lập" },
      { slug: "tu-thuc", name: "Tư thục" },
      { slug: "dan-lap", name: "Dân lập" },
      { slug: "gdnn-gdtx", name: "GDNN - GDTX" },
    ],
  },
  {
    module: "xep-hang-di-tich",
    label: "Di tích (xếp hạng)",
    prune: false,
    tree: [
      { slug: "quoc-gia", name: "Di tích quốc gia" },
      { slug: "cap-tinh", name: "Di tích cấp tỉnh" },
      { slug: "kiem-ke", name: "Trong danh mục kiểm kê" },
    ],
  },
];

// ---- Upsert đệ quy: tự tính path / ancestors / depth từ cha ----
// Gom mọi path đã seed vào `seenPaths` để prune node thừa sau đó.
async function seedTree(
  col: import("mongodb").Collection<CategoryDoc>,
  module: string,
  nodes: SeedNode[],
  parent: CategoryDoc | null,
  seenPaths: string[],
) {
  let order = 0;
  for (const n of nodes) {
    const path = `${parent ? parent.path : ""}/${n.slug}`;
    const now = new Date();
    const doc = await col.findOneAndUpdate(
      { module, path },
      {
        $set: {
          name: n.name,
          parentId: parent ? parent._id! : null,
          ancestors: parent ? [...parent.ancestors, parent._id!] : [],
          depth: parent ? parent.depth + 1 : 0,
          order: order++,
          icon: n.icon,
          href: n.href,
          description: n.description,
          active: true,
          updatedAt: now,
        },
        $setOnInsert: { module, slug: n.slug, path, createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    seenPaths.push(path);
    if (n.children?.length) {
      await seedTree(col, module, n.children, doc as CategoryDoc, seenPaths);
    }
  }
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const col = client.db(dbName).collection<CategoryDoc>("categories");
    await col.createIndex({ module: 1, path: 1 }, { unique: true });
    await col.createIndex({ module: 1, parentId: 1, order: 1 });
    await col.createIndex({ ancestors: 1 });

    let total = 0;
    for (const m of MODULES) {
      const seenPaths: string[] = [];
      await seedTree(col, m.module, m.tree, null, seenPaths);
      // Prune: xoá node cũ KHÔNG còn trong cây seed — CHỈ với module seed là nguồn chuẩn.
      // Module do admin quản lý (prune=false) → giữ nguyên node admin thêm.
      const pruned = m.prune === false
        ? { deletedCount: 0 }
        : await col.deleteMany({ module: m.module, path: { $nin: seenPaths } });
      total += seenPaths.length;
      const extra = pruned.deletedCount ? ` (đã dọn ${pruned.deletedCount} node cũ)` : "";
      console.log(`✓ ${m.label} (${m.module}): ${seenPaths.length} danh mục${extra}`);
    }
    console.log(`\n✅ Đã seed ${total} danh mục vào "${dbName}".`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("❌ Seed thất bại:", err);
  // eslint-disable-next-line no-undef
  process.exit(1);
});
