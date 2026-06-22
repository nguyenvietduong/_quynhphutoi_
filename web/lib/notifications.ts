// Thông báo (notifications) cho người dùng.
//   - Mỗi bản ghi gửi tới 1 người nhận (userId).
//   - Sự kiện fan-out (vd gửi tất cả admin) → tạo nhiều bản ghi.
//   - Không tự thông báo cho chính người gây ra hành động (actor).
import { getDb, ensureIndexes } from "@/lib/db";
import { ObjectId } from "mongodb";

export type NotifType =
  | "post_pending"     // có tin mới chờ duyệt (→ admin)
  | "post_approved"    // tin được duyệt (→ chủ tin)
  | "post_rejected"    // tin bị từ chối (→ chủ tin)
  | "comment"          // có bình luận mới (→ chủ tin + người trong thread)
  | "like"             // có lượt thích mới (→ chủ tin)
  | "announcement";    // thông báo chung từ ban quản trị (broadcast)

export type NotificationDoc = {
  _id?: ObjectId;
  userId: ObjectId;        // người nhận
  type: NotifType;
  title: string;           // dòng mô tả ngắn
  href: string;            // liên kết tới đối tượng
  actorName?: string;      // người gây ra hành động
  module?: string;         // tim-do-roi | viec-lam | mua-ban | tin-tuc
  read: boolean;
  createdAt: Date;
};

const toId = (v: ObjectId | string): ObjectId => (typeof v === "string" ? new ObjectId(v) : v);
const isId = (v: string) => ObjectId.isValid(v);

export async function notifications() {
  const db = await getDb();
  const col = db.collection<NotificationDoc>("notifications");
  await ensureIndexes("notifications", () => Promise.all([
    col.createIndex({ userId: 1, createdAt: -1 }),
    col.createIndex({ userId: 1, read: 1 }),
  ]));
  return col;
}

export type NotifInput = {
  type: NotifType;
  title: string;
  href: string;
  actorName?: string;
  module?: string;
};

// Gửi cho 1 người (bỏ qua nếu trùng actor hoặc id không hợp lệ).
export async function notifyUser(recipientId: ObjectId | string, input: NotifInput, actorId?: string) {
  const rid = typeof recipientId === "string" ? (isId(recipientId) ? recipientId : null) : recipientId.toString();
  if (!rid) return;
  if (actorId && rid === actorId) return; // không tự thông báo cho mình
  const col = await notifications();
  await col.insertOne({ userId: toId(rid), ...input, read: false, createdAt: new Date() });
}

// Gửi cho nhiều người (loại trùng + bỏ actor).
export async function notifyMany(recipientIds: Array<ObjectId | string>, input: NotifInput, actorId?: string) {
  const ids = [...new Set(recipientIds.map((v) => v.toString()))].filter((id) => isId(id) && id !== actorId);
  if (ids.length === 0) return;
  const col = await notifications();
  const now = new Date();
  await col.insertMany(ids.map((id) => ({ userId: new ObjectId(id), ...input, read: false, createdAt: now })));
}

// Gửi cho tất cả admin (trừ actor).
export async function notifyAdmins(input: NotifInput, actorId?: string) {
  const db = await getDb();
  const admins = await db.collection("users").find({ role: "admin" }, { projection: { _id: 1 } }).toArray();
  await notifyMany(admins.map((a) => a._id), input, actorId);
}

// Gửi cho toàn bộ ban quản trị: admin + editor (trừ actor).
export async function notifyStaff(input: NotifInput, actorId?: string) {
  const db = await getDb();
  const staff = await db.collection("users").find(
    { role: { $in: ["admin", "editor"] } },
    { projection: { _id: 1 } },
  ).toArray();
  await notifyMany(staff.map((s) => s._id), input, actorId);
}

// Gửi broadcast tới toàn bộ người dùng (hoặc chỉ admin). Trả về số người nhận.
export async function broadcastToAll(input: NotifInput, opts: { adminsOnly?: boolean } = {}, actorId?: string) {
  const db = await getDb();
  const query = opts.adminsOnly ? { role: "admin" } : {};
  const recipients = await db.collection("users").find(query, { projection: { _id: 1 } }).toArray();
  const ids = recipients.map((r) => r._id);
  await notifyMany(ids, input, actorId);
  return ids.filter((id) => id.toString() !== actorId).length;
}

// ---- Đọc / đánh dấu ----
export async function listNotifications(userId: string, opts: { limit?: number; skip?: number } = {}) {
  const col = await notifications();
  const cur = col.find({ userId: toId(userId) }).sort({ createdAt: -1 });
  if (opts.skip) cur.skip(opts.skip);
  cur.limit(opts.limit ?? 30);
  return cur.toArray();
}

export async function countUnread(userId: string) {
  return (await notifications()).countDocuments({ userId: toId(userId), read: false });
}

export async function markRead(id: string, userId: string) {
  if (!isId(id)) return 0;
  const res = await (await notifications()).updateOne({ _id: new ObjectId(id), userId: toId(userId) }, { $set: { read: true } });
  return res.modifiedCount;
}

export async function markAllRead(userId: string) {
  const res = await (await notifications()).updateMany({ userId: toId(userId), read: false }, { $set: { read: true } });
  return res.modifiedCount;
}
