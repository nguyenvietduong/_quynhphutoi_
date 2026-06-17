// Việc làm — tin tuyển dụng địa phương xã Quỳnh Phụ.
// Theo pattern repo (mongodb native, helper trong file). Quan hệ:
//   - industry: slug danh mục module "viec-lam"; jobType: slug danh mục module
//     "loai-hinh-cong-viec" (cả hai do admin quản lý qua collection categories;
//     denormalize label vào bản ghi để hiển thị nhanh & giữ nhãn bản ghi cũ).
//   - location.wardSlug → đơn vị hành chính (lib/wards.ts).
//   - postedBy → users (lib/users.ts) — phải đăng nhập mới đăng tin.
// Kiểm duyệt: approved=false khi tạo, admin duyệt mới hiện công khai (như tìm đồ rơi).
import { getDb, ensureIndexes } from "@/lib/db";
import { ObjectId, type Filter } from "mongodb";
import { categoryName } from "@/lib/categories";
import type { SeoFields } from "@/lib/seo-fields";

// Loại hình / ngành nghề đều là slug danh mục (chuỗi tự do, không enum cố định).
export type JobType = string;
export type JobStatus = "open" | "closed" | "filled";

export type JobContact = { name: string; phone: string; email?: string; hidePhone?: boolean };
export type JobLocation = { wardSlug: string; address?: string; mapUrl?: string }; // FK → admin_units.slug
// Lương theo triệu VND/tháng. negotiable=true → "Thỏa thuận".
export type SalaryInfo = { min?: number | null; max?: number | null; negotiable?: boolean };
// Độ tuổi ứng viên (tuổi tối thiểu / tối đa). Để trống = không yêu cầu.
export type AgeRange = { min?: number | null; max?: number | null };

export type JobDoc = {
  _id?: ObjectId;
  slug: string;
  title: string;            // vị trí tuyển dụng
  company: string;          // nhà tuyển dụng
  industry: string;         // slug ngành
  industryLabel: string;    // denormalize
  jobType: JobType;
  jobTypeLabel: string;     // denormalize
  description: string;      // HTML (mô tả · yêu cầu · quyền lợi) — đã sanitize
  images?: string[];        // ảnh minh hoạ (URL /uploads/…)
  salary: SalaryInfo;
  location: JobLocation;
  age?: AgeRange;               // độ tuổi ứng viên (tuỳ chọn)
  quantity?: number | null;     // số lượng cần tuyển
  experience?: string;          // kinh nghiệm yêu cầu
  education?: string;           // trình độ
  deadline?: Date | null;       // hạn nộp hồ sơ
  contact: JobContact;
  seo?: SeoFields;          // ghi đè SEO trang chi tiết (admin, tuỳ chọn)
  postedBy: ObjectId;
  postedByName: string;
  status: JobStatus;
  approved: boolean;
  verified: boolean;
  featured: boolean;
  views: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
};

const toId = (v: ObjectId | string): ObjectId => (typeof v === "string" ? new ObjectId(v) : v);

export function slugify(s: string) {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-");
}

// Hiển thị mức lương gọn: "8 - 12 triệu", "Từ 7 triệu", "Thỏa thuận".
export function formatSalary(s: SalaryInfo): string {
  if (s.negotiable || (!s.min && !s.max)) return "Thỏa thuận";
  if (s.min && s.max) return `${s.min} - ${s.max} triệu`;
  if (s.min) return `Từ ${s.min} triệu`;
  return `Tới ${s.max} triệu`;
}

// Hiển thị độ tuổi gọn: "18 - 35 tuổi", "Từ 18 tuổi", "Đến 35 tuổi", "" (không yêu cầu).
export function formatAge(a?: AgeRange | null): string {
  if (!a) return "";
  const min = a.min ?? null, max = a.max ?? null;
  if (min && max) return `${min} - ${max} tuổi`;
  if (min) return `Từ ${min} tuổi`;
  if (max) return `Đến ${max} tuổi`;
  return "";
}

export async function jobs() {
  const db = await getDb();
  const col = db.collection<JobDoc>("jobs");
  await ensureIndexes("jobs", () => Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ industry: 1, status: 1, createdAt: -1 }),
    col.createIndex({ jobType: 1, createdAt: -1 }),
    col.createIndex({ "location.wardSlug": 1, createdAt: -1 }),
    col.createIndex({ postedBy: 1, createdAt: -1 }),
    col.createIndex({ approved: 1, active: 1, createdAt: -1 }),
    col.createIndex({ title: "text", company: "text", description: "text" }, { default_language: "none" }),
  ]));
  return col;
}

// ---- Tạo tin ----
export type CreateJobInput = {
  title: string;
  company: string;
  industry: string;
  jobType: JobType;
  description: string;
  images?: string[];
  salary: SalaryInfo;
  location: JobLocation;
  age?: AgeRange;
  quantity?: number | null;
  experience?: string;
  education?: string;
  deadline?: Date | null;
  contact: JobContact;
  slug?: string;
  approved?: boolean;   // mặc định false (chờ duyệt); admin có thể tắt duyệt → true
};

async function uniqueSlug(col: import("mongodb").Collection<JobDoc>, base: string) {
  const root = base || "tin-tuyen-dung";
  let slug = root;
  let i = 2;
  while (await col.findOne({ slug })) slug = `${root}-${i++}`;
  return slug;
}

export async function createJob(poster: { id: string; name: string }, input: CreateJobInput) {
  const col = await jobs();
  const now = new Date();
  const slug = await uniqueSlug(col, input.slug || slugify(`${input.title}-${input.company}`));
  const doc: JobDoc = {
    slug,
    title: input.title.trim(),
    company: input.company.trim(),
    industry: input.industry,
    industryLabel: await categoryName("viec-lam", input.industry),
    jobType: input.jobType,
    jobTypeLabel: await categoryName("loai-hinh-cong-viec", input.jobType),
    description: input.description,
    images: input.images ?? [],
    salary: input.salary,
    location: input.location,
    age: input.age ?? { min: null, max: null },
    quantity: input.quantity ?? null,
    experience: input.experience,
    education: input.education,
    deadline: input.deadline ?? null,
    contact: input.contact,
    postedBy: new ObjectId(poster.id),
    postedByName: poster.name,
    status: "open",
    approved: input.approved ?? false,
    verified: false,
    featured: false,
    views: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  };
  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}

// ---- Truy vấn ----
export async function getJobBySlug(slug: string) {
  return (await jobs()).findOne({ slug });
}

export type ListJobOpts = {
  industry?: string;
  jobType?: JobType;
  wardSlug?: string;
  status?: JobStatus;
  search?: string;
  approvedOnly?: boolean;   // public: chỉ tin đã duyệt + active (mặc định true)
  approved?: boolean;       // admin: lọc rõ theo cờ duyệt
  limit?: number;
  skip?: number;
};

function buildFilter(opts: ListJobOpts): Filter<JobDoc> {
  const filter: Filter<JobDoc> = {};
  if (opts.approvedOnly !== false) { filter.approved = true; filter.active = true; }
  if (typeof opts.approved === "boolean") filter.approved = opts.approved;
  if (opts.industry) filter.industry = opts.industry;
  if (opts.jobType) filter.jobType = opts.jobType;
  if (opts.wardSlug) filter["location.wardSlug"] = opts.wardSlug;
  if (opts.status) filter.status = opts.status;
  if (opts.search?.trim()) filter.$text = { $search: opts.search.trim() };
  return filter;
}

export async function listJobs(opts: ListJobOpts = {}) {
  const col = await jobs();
  // Tin nổi bật lên trước, rồi mới nhất.
  const cur = col.find(buildFilter(opts)).sort({ featured: -1, createdAt: -1 });
  if (opts.skip) cur.skip(opts.skip);
  if (opts.limit) cur.limit(opts.limit);
  return cur.toArray();
}

export async function countJobs(opts: ListJobOpts = {}) {
  return (await jobs()).countDocuments(buildFilter(opts));
}

export async function listMyJobs(userId: ObjectId | string) {
  const col = await jobs();
  return col.find({ postedBy: toId(userId) }).sort({ createdAt: -1 }).toArray();
}

export async function listPendingJobs(opts: { limit?: number } = {}) {
  const col = await jobs();
  const cur = col.find({ approved: false, active: true }).sort({ createdAt: 1 });
  if (opts.limit) cur.limit(opts.limit);
  return cur.toArray();
}

export async function countPendingJobs() {
  return (await jobs()).countDocuments({ approved: false, active: true });
}

export async function relatedJobs(slug: string, n = 3) {
  const col = await jobs();
  const cur = await col.findOne({ slug });
  if (!cur) return [];
  return col
    .find({ slug: { $ne: slug }, industry: cur.industry, approved: true, active: true })
    .sort({ createdAt: -1 }).limit(n).toArray();
}

// ---- Cập nhật ----
export async function incrementViews(slug: string) {
  await (await jobs()).updateOne({ slug }, { $inc: { views: 1 } });
}

export async function markClosed(slug: string) {
  const now = new Date();
  await (await jobs()).updateOne({ slug }, { $set: { status: "closed", closedAt: now, updatedAt: now } });
}

export async function approveJob(slug: string, approved = true) {
  await (await jobs()).updateOne({ slug }, { $set: { approved, updatedAt: new Date() } });
}

export async function deleteJob(slug: string) {
  const res = await (await jobs()).deleteOne({ slug });
  return res.deletedCount;
}

// Admin sửa nội dung tin (ngoài duyệt). description đã sanitize ở tầng route.
export type JobPatch = Partial<{ title: string; company: string; industry: string; jobType: JobType; description: string; featured: boolean; approved: boolean; status: JobStatus; images: string[]; seo: SeoFields }>
  & { "location.address"?: string; "location.mapUrl"?: string };
export async function updateJob(slug: string, patch: JobPatch) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[k] = v;
  if (patch.title) set.title = patch.title.trim();
  if (patch.company) set.company = patch.company.trim();
  // Đổi ngành / loại hình → resolve lại nhãn denormalize từ danh mục.
  if (patch.industry !== undefined) set.industryLabel = await categoryName("viec-lam", patch.industry);
  if (patch.jobType !== undefined) set.jobTypeLabel = await categoryName("loai-hinh-cong-viec", patch.jobType);
  const res = await (await jobs()).updateOne({ slug }, { $set: set });
  return res.matchedCount;
}
