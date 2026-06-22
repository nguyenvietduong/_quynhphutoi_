// Truy xuất người dùng trong MongoDB + token xác nhận / đặt lại mật khẩu.
import { getDb, ensureIndexes } from "@/lib/db";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export type UserRole = "admin" | "editor" | "user";

export type UserDoc = {
  _id?: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  verified: boolean;
  banned?: boolean;            // true = tài khoản bị khóa, không thể đăng nhập.
  warnCount?: number;          // số lần bị cảnh báo vi phạm nội quy.
  avatar?: string | null;     // URL ảnh đại diện (Cloudinary). Trống = dùng chữ cái đầu.
  role?: UserRole;            // thiếu = "user". "admin" toàn quyền; "editor" làm nội dung + kiểm duyệt.
  verifyToken?: string | null;
  verifyTokenExp?: Date | null;
  resetToken?: string | null;
  resetTokenExp?: Date | null;
  rulesAgreedAt?: Date | null;    // thời điểm đồng ý nội quy cộng đồng
  rulesAgreedVersion?: number;    // phiên bản nội quy đã đồng ý (so với RULES_VERSION)
  createdAt: Date;
};

export const isAdmin = (u: Pick<UserDoc, "role"> | null | undefined) => u?.role === "admin";
// Biên tập viên: làm nội dung + kiểm duyệt, KHÔNG đụng quản trị hệ thống.
export const isEditor = (u: Pick<UserDoc, "role"> | null | undefined) => u?.role === "editor";
// Nhân sự khu quản trị = admin ∪ editor (được vào /admin).
export const isStaff = (u: Pick<UserDoc, "role"> | null | undefined) => isAdmin(u) || isEditor(u);

async function users() {
  const db = await getDb();
  const col = db.collection<UserDoc>("users");
  await ensureIndexes("users", () => col.createIndex({ email: 1 }, { unique: true }));
  return col;
}

export const normEmail = (e: string) => e.trim().toLowerCase();
const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
const randomToken = () => crypto.randomBytes(32).toString("hex");

export async function findByEmail(email: string) {
  return (await users()).findOne({ email: normEmail(email) });
}

export async function findById(id: string | ObjectId) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return null;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  return (await users()).findOne({ _id });
}

// ---- Admin: quản lý người dùng ----
export type UserListOpts = { search?: string; role?: UserRole; status?: "active" | "warned" | "banned"; limit?: number; skip?: number };

function userFilter(opts: UserListOpts) {
  const filter: Record<string, unknown> = {};
  if (opts.role) {
    filter.role = opts.role === "user" ? { $nin: ["admin", "editor"] } : opts.role;
  }
  if (opts.status === "banned")  filter.banned = true;
  if (opts.status === "warned")  { filter.banned = { $ne: true }; filter.warnCount = { $gt: 0 }; }
  if (opts.status === "active")  { filter.banned = { $ne: true }; filter.$or = [{ warnCount: { $exists: false } }, { warnCount: 0 }]; }
  if (opts.search?.trim()) {
    const rx = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ email: rx }, { name: rx }];
  }
  return filter;
}

export async function listUsers(opts: UserListOpts = {}) {
  const col = await users();
  const cur = col.find(userFilter(opts)).sort({ createdAt: -1 });
  if (opts.skip) cur.skip(opts.skip);
  if (opts.limit) cur.limit(opts.limit);
  return cur.toArray();
}

export async function countUsers(opts: UserListOpts = {}) {
  return (await users()).countDocuments(userFilter(opts));
}

export async function setUserRole(id: string | ObjectId, role: UserRole) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return 0;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await (await users()).updateOne({ _id }, { $set: { role } });
  return res.matchedCount;
}

export async function setUserVerified(id: string | ObjectId, verified: boolean) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return 0;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await (await users()).updateOne({ _id }, { $set: { verified } });
  return res.matchedCount;
}

export async function deleteUser(id: string | ObjectId) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return 0;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await (await users()).deleteOne({ _id });
  return res.deletedCount;
}

// Bản ghi phẳng cho client admin (KHÔNG kèm passwordHash / token).
export type UserRow = { id: string; email: string; name: string; role: UserRole; verified: boolean; banned: boolean; warnCount: number; createdAt: string };
export function toUserRow(u: UserDoc): UserRow {
  return {
    id: u._id!.toString(), email: u.email, name: u.name,
    role: u.role === "admin" ? "admin" : u.role === "editor" ? "editor" : "user",
    verified: u.verified,
    banned: u.banned === true,
    warnCount: u.warnCount ?? 0,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
  };
}

export async function setBanned(id: string | ObjectId, banned: boolean) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return 0;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await (await users()).updateOne({ _id }, { $set: { banned } });
  return res.matchedCount;
}

const AUTO_BAN_THRESHOLD = 3;

export async function addWarning(id: string | ObjectId) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return null;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const col = await users();
  const doc = await col.findOneAndUpdate(
    { _id },
    { $inc: { warnCount: 1 } },
    { returnDocument: "after" },
  );
  if (!doc) return null;
  const warnCount = doc.warnCount ?? 1;
  const autoBanned = warnCount >= AUTO_BAN_THRESHOLD;
  if (autoBanned) await col.updateOne({ _id }, { $set: { banned: true } });
  return { warnCount, autoBanned };
}

// Giảm warnCount 1 đơn vị (tối thiểu 0) khi user xóa bài bị cảnh báo.
export async function removeWarning(id: string | ObjectId) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return null;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const col = await users();
  const doc = await col.findOneAndUpdate(
    { _id, $or: [{ warnCount: { $gt: 0 } }, { warnCount: { $exists: false } }] },
    [{ $set: { warnCount: { $max: [{ $subtract: [{ $ifNull: ["$warnCount", 0] }, 1] }, 0] } } }],
    { returnDocument: "after" },
  );
  return doc ? { warnCount: doc.warnCount ?? 0 } : null;
}

export async function clearWarnings(id: string | ObjectId) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return 0;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await (await users()).updateOne({ _id }, { $set: { warnCount: 0 } });
  return res.matchedCount;
}

export async function createUser(email: string, name: string, password: string) {
  const col = await users();
  const passwordHash = await bcrypt.hash(password, 10);
  // Bỏ xác nhận email: tài khoản tạo xong dùng được ngay (verified = true).
  const res = await col.insertOne({
    email: normEmail(email),
    name: name.trim(),
    passwordHash,
    verified: true,
    createdAt: new Date(),
  });
  return { id: res.insertedId.toString() };
}

// Bootstrap admin: đảm bảo tài khoản admin tồn tại (tạo mới ĐÃ xác minh, hoặc nâng
// quyền + xác minh nếu email đã có). Idempotent — gọi an toàn nhiều lần.
export async function ensureAdmin(email: string, name: string, password: string): Promise<"created" | "promoted" | "exists"> {
  const col = await users();
  const e = normEmail(email);
  const existing = await col.findOne({ email: e });
  if (existing) {
    if (existing.role !== "admin" || !existing.verified) {
      await col.updateOne({ _id: existing._id }, { $set: { role: "admin", verified: true } });
      return "promoted";
    }
    return "exists";
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await col.insertOne({
    email: e,
    name: name.trim() || "Quản trị viên",
    passwordHash,
    verified: true,
    role: "admin",
    createdAt: new Date(),
  });
  return "created";
}

export async function verifyByToken(token: string) {
  const col = await users();
  const u = await col.findOne({ verifyToken: hashToken(token), verifyTokenExp: { $gt: new Date() } });
  if (!u) return null;
  await col.updateOne(
    { _id: u._id },
    { $set: { verified: true }, $unset: { verifyToken: "", verifyTokenExp: "" } },
  );
  return u;
}

export async function checkPassword(user: UserDoc, password: string) {
  return bcrypt.compare(password, user.passwordHash);
}

// Cập nhật tên hiển thị của người dùng. Trả về user sau khi cập nhật.
export async function updateUserName(id: string | ObjectId, name: string) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return null;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const col = await users();
  await col.updateOne({ _id }, { $set: { name: name.trim() } });
  return col.findOne({ _id });
}

// Cập nhật hồ sơ (tên hiển thị + ảnh đại diện). avatar="" → xoá ảnh (về chữ cái đầu).
export async function updateUserProfile(
  id: string | ObjectId,
  patch: { name?: string; avatar?: string | null },
) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return null;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const set: Record<string, unknown> = {};
  if (typeof patch.name === "string") set.name = patch.name.trim();
  if (patch.avatar !== undefined) set.avatar = patch.avatar ? patch.avatar : null;
  const col = await users();
  if (Object.keys(set).length) await col.updateOne({ _id }, { $set: set });
  return col.findOne({ _id });
}

// Ghi nhận người dùng đã đồng ý nội quy cộng đồng (kèm phiên bản đang hiển thị).
export async function setRulesAgreed(id: string | ObjectId, version: number) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return 0;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const res = await (await users()).updateOne(
    { _id },
    { $set: { rulesAgreedAt: new Date(), rulesAgreedVersion: version } },
  );
  return res.matchedCount;
}

// Đổi mật khẩu (mật khẩu cũ đã được xác thực ở tầng route).
export async function setUserPassword(id: string | ObjectId, newPassword: string) {
  if (typeof id === "string" && !ObjectId.isValid(id)) return false;
  const _id = typeof id === "string" ? new ObjectId(id) : id;
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await (await users()).updateOne({ _id }, { $set: { passwordHash } });
  return true;
}

export async function setResetToken(email: string) {
  const col = await users();
  const u = await col.findOne({ email: normEmail(email) });
  if (!u) return null;
  const token = randomToken();
  await col.updateOne(
    { _id: u._id },
    { $set: { resetToken: hashToken(token), resetTokenExp: new Date(Date.now() + 1000 * 60 * 60) } },
  );
  return { user: u, token };
}

export async function resetPasswordByToken(token: string, newPassword: string) {
  const col = await users();
  const u = await col.findOne({ resetToken: hashToken(token), resetTokenExp: { $gt: new Date() } });
  if (!u) return null;
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await col.updateOne(
    { _id: u._id },
    { $set: { passwordHash, verified: true }, $unset: { resetToken: "", resetTokenExp: "" } },
  );
  return u;
}
