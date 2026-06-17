// Seed tin tuyển dụng demo cho phân hệ Việc làm.
// Phụ thuộc: cần 1 user làm người đăng (postedBy). Nếu users rỗng → tạo demo.
// Idempotent: upsert theo slug + prune. Chạy: npm run seed:jobs

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import type { JobDoc } from "../lib/jobs";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "quynhphu";

// Bản đồ nhãn (seed tự chứa — không import runtime để chạy độc lập).
const INDUSTRY_NAMES: Record<string, string> = {
  "nong-nghiep": "Nông nghiệp - Thủy sản", "san-xuat": "Sản xuất - Công nghiệp",
  "may-mac": "May mặc - Da giày", "co-khi-dien": "Cơ khí - Điện - Điện tử",
  "xay-dung": "Xây dựng", "kinh-doanh": "Bán hàng - Kinh doanh",
  "dich-vu": "Dịch vụ - Nhà hàng - Khách sạn", "van-tai": "Vận tải - Kho bãi",
  "van-phong": "Hành chính - Văn phòng", "ke-toan": "Kế toán - Tài chính",
  "giao-duc": "Giáo dục - Đào tạo", "y-te": "Y tế - Chăm sóc sức khỏe",
  "cntt": "Công nghệ thông tin", "lao-dong-pho-thong": "Lao động phổ thông", "khac": "Ngành nghề khác",
};
const JOBTYPE_NAMES: Record<string, string> = {
  "toan-thoi-gian": "Toàn thời gian", "ban-thoi-gian": "Bán thời gian",
  "thoi-vu": "Thời vụ", "thuc-tap": "Thực tập",
};
const industryName = (s: string) => INDUSTRY_NAMES[s] ?? "Ngành nghề khác";
const jobTypeName = (s: string) => JOBTYPE_NAMES[s] ?? "Toàn thời gian";

type SeedJob = {
  slug: string;
  title: string;
  company: string;
  industry: string;          // slug danh mục module "viec-lam"
  jobType: string;           // slug danh mục module "loai-hinh-cong-viec"
  description: string;       // HTML
  salary: { min?: number; max?: number; negotiable?: boolean };
  ward: string;
  wardSlug: string;
  address?: string;
  quantity?: number;
  experience?: string;
  education?: string;
  deadline?: string;         // ISO
  contact: { name: string; phone: string; email?: string };
  featured?: boolean;
  approved: boolean;
  daysAgo: number;
  images: string[];
};

// Ảnh thật theo chủ đề nơi làm việc (loremflickr, ?lock cố định để seed ổn định).
const img = (kw: string, ...locks: number[]) => locks.map((l) => `https://loremflickr.com/800/600/${kw}?lock=${l}`);

const JD = (mota: string, yeucau: string[], quyenloi: string[]) =>
  `<h3>Mô tả công việc</h3><p>${mota}</p>` +
  `<h3>Yêu cầu</h3><ul>${yeucau.map((x) => `<li>${x}</li>`).join("")}</ul>` +
  `<h3>Quyền lợi</h3><ul>${quyenloi.map((x) => `<li>${x}</li>`).join("")}</ul>`;

const JOBS: SeedJob[] = [
  {
    slug: "cong-nhan-may-cong-ty-tnhh-may-quynh-phu",
    title: "Công nhân may công nghiệp", company: "Công ty TNHH May Quỳnh Phụ",
    industry: "may-mac", jobType: "toan-thoi-gian",
    description: JD(
      "Vận hành máy may công nghiệp, may các công đoạn theo chuyền (áo, quần xuất khẩu). Làm việc trong xưởng có điều hòa, môi trường sạch sẽ.",
      ["Nam/Nữ 18–45 tuổi, sức khỏe tốt", "Biết may cơ bản là lợi thế (chưa biết được đào tạo)", "Chăm chỉ, gắn bó lâu dài"],
      ["Lương 7–11 triệu + thưởng năng suất", "Cơm ca, xe đưa đón theo tuyến", "Đóng BHXH, BHYT đầy đủ; thưởng lễ Tết"],
    ),
    salary: { min: 7, max: 11 }, ward: "Thị trấn Quỳnh Côi", wardSlug: "quynh-coi", address: "Cụm CN Quỳnh Côi",
    quantity: 50, experience: "Không yêu cầu", education: "Không yêu cầu",
    deadline: "2026-07-31", contact: { name: "Phòng Nhân sự", phone: "0912000111", email: "tuyendung@mayquynhphu.vn" },
    featured: true, approved: true, daysAgo: 1, images: img("factory", 101, 102, 103),
  },
  {
    slug: "nhan-vien-ban-hang-sieu-thi-mini",
    title: "Nhân viên bán hàng siêu thị mini", company: "Cửa hàng Winmart+ An Bài",
    industry: "kinh-doanh", jobType: "toan-thoi-gian",
    description: JD(
      "Tư vấn, bán hàng, sắp xếp hàng hóa lên kệ, thu ngân và vệ sinh khu vực được phân công.",
      ["Nữ 18–30 tuổi, ngoại hình ưa nhìn, giao tiếp tốt", "Trung thực, nhanh nhẹn", "Làm theo ca xoay"],
      ["Lương 6–8 triệu + thưởng doanh số", "Được đào tạo nghiệp vụ", "Môi trường trẻ trung, thân thiện"],
    ),
    salary: { min: 6, max: 8 }, ward: "Thị trấn An Bài", wardSlug: "an-bai", address: "Quốc lộ 10, TT An Bài",
    quantity: 4, experience: "Không yêu cầu", education: "Tốt nghiệp THPT",
    deadline: "2026-07-15", contact: { name: "Chị Hương", phone: "0987000222" },
    approved: true, daysAgo: 2, images: img("supermarket", 111, 112),
  },
  {
    slug: "ke-toan-tong-hop-cong-ty-thuc-pham",
    title: "Kế toán tổng hợp", company: "Công ty CP Thực phẩm Quỳnh Phụ",
    industry: "ke-toan", jobType: "toan-thoi-gian",
    description: JD(
      "Hạch toán kế toán, lập báo cáo thuế, theo dõi công nợ và làm việc với cơ quan thuế.",
      ["Tốt nghiệp Cao đẳng/Đại học chuyên ngành Kế toán", "Kinh nghiệm tối thiểu 2 năm", "Thành thạo Excel, phần mềm MISA"],
      ["Lương 9–14 triệu thỏa thuận theo năng lực", "Thưởng KPI quý, lương tháng 13", "BHXH full lương"],
    ),
    salary: { min: 9, max: 14 }, ward: "Xã Quỳnh Hồng", wardSlug: "quynh-hong",
    quantity: 2, experience: "2 năm", education: "Cao đẳng trở lên",
    deadline: "2026-08-10", contact: { name: "Anh Tuấn (HR)", phone: "0905000333", email: "hr@tpquynhphu.vn" },
    featured: true, approved: true, daysAgo: 3, images: img("office", 121, 122),
  },
  {
    slug: "tai-xe-xe-tai-giao-hang",
    title: "Tài xế xe tải giao hàng (bằng C)", company: "Nhà phân phối Đức Thịnh",
    industry: "van-tai", jobType: "toan-thoi-gian",
    description: JD(
      "Lái xe tải 3,5 tấn giao hàng cho đại lý trong huyện và các huyện lân cận; phụ giao nhận, kiểm đếm hàng.",
      ["Nam, có bằng lái hạng C còn hạn", "Thông thạo đường khu vực Thái Bình", "Sức khỏe tốt, không tệ nạn"],
      ["Lương 10–13 triệu + phụ cấp chuyến", "Hỗ trợ ăn trưa, điện thoại", "Thưởng chuyên cần"],
    ),
    salary: { min: 10, max: 13 }, ward: "Xã An Vũ", wardSlug: "an-vu", address: "Kho hàng QL10",
    quantity: 3, experience: "1 năm lái xe tải", education: "Không yêu cầu",
    deadline: "2026-07-20", contact: { name: "Anh Đức", phone: "0913000444" },
    approved: true, daysAgo: 4, images: img("truck", 131, 132),
  },
  {
    slug: "giao-vien-mam-non-truong-tu-thuc",
    title: "Giáo viên mầm non", company: "Trường Mầm non tư thục Quang Minh",
    industry: "giao-duc", jobType: "toan-thoi-gian",
    description: JD(
      "Chăm sóc, nuôi dạy trẻ theo chương trình; phối hợp phụ huynh và tổ chức hoạt động cho trẻ.",
      ["Tốt nghiệp Trung cấp Sư phạm Mầm non trở lên", "Yêu trẻ, kiên nhẫn, có trách nhiệm", "Ưu tiên có kinh nghiệm"],
      ["Lương 6–9 triệu + phụ cấp đứng lớp", "Nghỉ hè, thưởng các ngày lễ", "Môi trường giáo dục thân thiện"],
    ),
    salary: { min: 6, max: 9 }, ward: "Thị trấn Quỳnh Côi", wardSlug: "quynh-coi", address: "46 Trần Hưng Đạo",
    quantity: 3, experience: "Ưu tiên có kinh nghiệm", education: "Trung cấp Sư phạm",
    deadline: "2026-08-01", contact: { name: "Cô Lan", phone: "0978000555" },
    approved: true, daysAgo: 5, images: img("school", 141, 142),
  },
  {
    slug: "tho-han-tho-co-khi",
    title: "Thợ hàn - Thợ cơ khí", company: "Xưởng Cơ khí Minh Đức",
    industry: "co-khi-dien", jobType: "toan-thoi-gian",
    description: JD(
      "Hàn, gia công cơ khí (cửa, lan can, khung nhà tiền chế) theo bản vẽ; lắp đặt tại công trình khi cần.",
      ["Nam 20–45 tuổi, biết hàn điện/hàn CO2", "Đọc được bản vẽ cơ khí cơ bản", "Chịu khó, cẩn thận"],
      ["Lương 9–15 triệu theo tay nghề", "Tăng ca tính thêm", "Hỗ trợ ăn trưa"],
    ),
    salary: { min: 9, max: 15 }, ward: "Xã Quỳnh Hải", wardSlug: "quynh-hai",
    quantity: 5, experience: "1–2 năm", education: "Không yêu cầu",
    deadline: "2026-07-25", contact: { name: "Anh Minh", phone: "0916000666" },
    approved: true, daysAgo: 2, images: img("factory", 151, 152),
  },
  {
    slug: "nhan-vien-phuc-vu-nha-hang",
    title: "Nhân viên phục vụ nhà hàng (bán thời gian)", company: "Nhà hàng Sông Quê",
    industry: "dich-vu", jobType: "ban-thoi-gian",
    description: JD(
      "Đón khách, order, phục vụ món, dọn bàn. Làm ca tối và cuối tuần, phù hợp sinh viên.",
      ["Nam/Nữ 18–28 tuổi, nhanh nhẹn", "Thái độ vui vẻ, chịu khó", "Làm được cuối tuần"],
      ["Lương 22.000đ–28.000đ/giờ", "Bao 1 bữa ăn ca", "Thưởng tip"],
    ),
    salary: { negotiable: true }, ward: "Xã Quỳnh Ngọc", wardSlug: "quynh-ngoc",
    quantity: 6, experience: "Không yêu cầu", education: "Không yêu cầu",
    deadline: "2026-07-18", contact: { name: "Quản lý Hà", phone: "0934000777" },
    approved: true, daysAgo: 1, images: img("restaurant", 161, 162),
  },
  {
    slug: "lao-dong-thoi-vu-thu-hoach",
    title: "Lao động thời vụ thu hoạch nông sản", company: "HTX Nông nghiệp Quỳnh Minh",
    industry: "nong-nghiep", jobType: "thoi-vu",
    description: JD(
      "Thu hoạch lúa, rau màu theo mùa vụ; bốc xếp, sơ chế nông sản tại HTX.",
      ["Nam/Nữ, sức khỏe tốt", "Chăm chỉ, làm việc ngoài trời được"],
      ["Công 250.000đ–300.000đ/ngày", "Bao cơm trưa", "Thanh toán theo tuần"],
    ),
    salary: { negotiable: true }, ward: "Xã Quỳnh Minh", wardSlug: "quynh-minh",
    quantity: 20, experience: "Không yêu cầu", education: "Không yêu cầu",
    deadline: "2026-06-30", contact: { name: "Bác Tâm (HTX)", phone: "0967000888" },
    approved: true, daysAgo: 0, images: img("farm", 171, 172),
  },
  {
    slug: "nhan-vien-it-helpdesk",
    title: "Nhân viên IT Helpdesk", company: "Công ty TNHH Công nghệ Quỳnh Phụ",
    industry: "cntt", jobType: "toan-thoi-gian",
    description: JD(
      "Hỗ trợ kỹ thuật máy tính, mạng nội bộ, cài đặt phần mềm cho văn phòng; xử lý sự cố cơ bản.",
      ["Tốt nghiệp CĐ/ĐH CNTT hoặc tương đương", "Biết cài đặt Windows, mạng LAN cơ bản", "Ham học hỏi"],
      ["Lương 8–12 triệu", "Được đào tạo nâng cao", "Môi trường trẻ, BHXH đầy đủ"],
    ),
    salary: { min: 8, max: 12 }, ward: "Thị trấn Quỳnh Côi", wardSlug: "quynh-coi",
    quantity: 2, experience: "Không yêu cầu", education: "Cao đẳng trở lên",
    deadline: "2026-08-15", contact: { name: "Anh Hoàng", phone: "0909000999", email: "it@congnghequynhphu.vn" },
    approved: false, daysAgo: 0, images: img("technology", 181, 182), // demo trạng thái chờ duyệt
  },
  {
    slug: "thuc-tap-sinh-marketing",
    title: "Thực tập sinh Marketing", company: "Công ty CP Truyền thông Quỳnh Phụ",
    industry: "van-phong", jobType: "thuc-tap",
    description: JD(
      "Hỗ trợ lên nội dung mạng xã hội, thiết kế ấn phẩm cơ bản, theo dõi chiến dịch quảng cáo cho doanh nghiệp địa phương.",
      ["Sinh viên năm 2–4 các ngành Marketing/Truyền thông", "Biết Canva/CapCut là lợi thế", "Năng động, ham học hỏi"],
      ["Phụ cấp 2–3 triệu/tháng", "Được đào tạo bài bản, có chứng nhận thực tập", "Cơ hội ký hợp đồng chính thức"],
    ),
    salary: { min: 2, max: 3 }, ward: "Thị trấn Quỳnh Côi", wardSlug: "quynh-coi",
    quantity: 3, experience: "Không yêu cầu", education: "Đang học Cao đẳng/Đại học",
    deadline: "2026-08-20", contact: { name: "Chị Mai (HR)", phone: "0911222333", email: "tuyendung@ttquynhphu.vn" },
    approved: true, daysAgo: 1, images: img("office", 191, 192),
  },
  {
    slug: "tho-xay-dung-cong-trinh-dan-dung",
    title: "Thợ xây dựng công trình dân dụng", company: "Đội thi công Phú Cường",
    industry: "xay-dung", jobType: "toan-thoi-gian",
    description: JD(
      "Xây, trát, ốp lát các công trình nhà dân và công trình nhỏ trên địa bàn xã và lân cận.",
      ["Nam 18–50 tuổi, có sức khỏe", "Biết nghề xây/trát cơ bản", "Chăm chỉ, đúng giờ"],
      ["Công 350.000đ–450.000đ/ngày theo tay nghề", "Bao cơm trưa tại công trình", "Việc đều quanh năm"],
    ),
    salary: { negotiable: true }, ward: "Xã An Vũ", wardSlug: "an-vu",
    quantity: 8, experience: "Ưu tiên có nghề", education: "Không yêu cầu",
    deadline: "2026-07-28", contact: { name: "Anh Cường", phone: "0915333444" },
    approved: true, daysAgo: 3, images: img("construction", 201, 202),
  },
  {
    slug: "dieu-duong-phong-kham-da-khoa",
    title: "Điều dưỡng viên", company: "Phòng khám Đa khoa An Khang",
    industry: "y-te", jobType: "toan-thoi-gian",
    description: JD(
      "Chăm sóc bệnh nhân, tiêm truyền, hỗ trợ bác sĩ trong khám và thực hiện thủ thuật.",
      ["Tốt nghiệp Trung cấp Điều dưỡng trở lên", "Có chứng chỉ hành nghề", "Cẩn thận, ân cần với bệnh nhân"],
      ["Lương 7–10 triệu", "BHXH, BHYT đầy đủ", "Môi trường chuyên nghiệp"],
    ),
    salary: { min: 7, max: 10 }, ward: "Thị trấn An Bài", wardSlug: "an-bai",
    quantity: 2, experience: "Ưu tiên có kinh nghiệm", education: "Trung cấp Điều dưỡng",
    deadline: "2026-08-05", contact: { name: "Chị Thu", phone: "0918444555", email: "tuyendung@ankhang.vn" },
    approved: true, daysAgo: 2, images: img("clinic", 211, 212),
  },
];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    const usersCol = db.collection("users");
    const col = db.collection<JobDoc>("jobs");

    await col.createIndex({ slug: 1 }, { unique: true });
    await col.createIndex({ industry: 1, status: 1, createdAt: -1 });
    await col.createIndex({ "location.wardSlug": 1, createdAt: -1 });
    await col.createIndex({ postedBy: 1, createdAt: -1 });
    await col.createIndex({ title: "text", company: "text", description: "text" }, { default_language: "none" });

    let poster = await usersCol.findOne({});
    if (!poster) {
      const passwordHash = await bcrypt.hash("123456", 10);
      const res = await usersCol.insertOne({
        email: "demo@quynhphu.vn", name: "Nhà tuyển dụng Quỳnh Phụ",
        passwordHash, verified: true, createdAt: new Date(),
      });
      poster = await usersCol.findOne({ _id: res.insertedId });
      console.log("• Đã tạo user demo: demo@quynhphu.vn / 123456");
    }
    const postedBy = poster!._id!;
    const postedByName = poster!.name;

    let ok = 0;
    const seenSlugs: string[] = [];
    for (const j of JOBS) {
      const created = new Date(Date.now() - j.daysAgo * 86400000);
      const fields: Omit<JobDoc, "_id" | "createdAt"> = {
        slug: j.slug,
        title: j.title,
        company: j.company,
        industry: j.industry,
        industryLabel: industryName(j.industry),
        jobType: j.jobType,
        jobTypeLabel: jobTypeName(j.jobType),
        description: j.description,
        images: j.images,
        salary: { min: j.salary.min ?? null, max: j.salary.max ?? null, negotiable: !!j.salary.negotiable },
        location: { wardSlug: j.wardSlug, address: j.address },
        quantity: j.quantity ?? null,
        experience: j.experience,
        education: j.education,
        deadline: j.deadline ? new Date(j.deadline) : null,
        contact: j.contact,
        postedBy,
        postedByName,
        status: "open",
        approved: j.approved,
        verified: j.approved,
        featured: !!j.featured,
        views: 0,
        active: true,
        updatedAt: new Date(),
        closedAt: null,
      };
      await col.updateOne(
        { slug: j.slug },
        { $set: fields, $setOnInsert: { createdAt: created } },
        { upsert: true },
      );
      seenSlugs.push(j.slug);
      ok++;
    }

    const pruned = await col.deleteMany({ slug: { $nin: seenSlugs } });
    console.log(`✓ Tin tuyển dụng : ${ok}`);
    console.log(`✓ Nổi bật        : ${JOBS.filter((j) => j.featured).length}`);
    console.log(`✓ Đã duyệt public: ${JOBS.filter((j) => j.approved).length}/${ok}`);
    if (pruned.deletedCount) console.log(`  (đã dọn ${pruned.deletedCount} tin cũ)`);
    console.log(`\n✅ Đã seed ${ok} tin việc làm vào "${dbName}".`);
  } finally {
    await client.close();
  }
}

main().catch((err) => { console.error("❌ Seed thất bại:", err); process.exit(1); });
