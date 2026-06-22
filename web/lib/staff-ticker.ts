// Lưu thông báo nội bộ ban quản trị — hiển thị dạng ticker chạy trên topbar admin.
import { getDb } from "@/lib/db";

export type TickerDoc = {
  text: string;
  actorName: string;
  createdAt: Date;
};

export type TickerItem = {
  text: string;
  actorName: string;
  createdAt: string;
};

async function col() {
  const db = await getDb();
  return db.collection<TickerDoc>("staff_ticker");
}

export async function addTickerItem(text: string, actorName: string) {
  const c = await col();
  await c.insertOne({ text, actorName, createdAt: new Date() });
  // Giữ tối đa 20 item mới nhất.
  const all = await c.find().sort({ createdAt: -1 }).skip(20).toArray();
  if (all.length > 0) await c.deleteMany({ createdAt: { $lte: all[0].createdAt } });
}

export async function listTickerItems(limit = 10): Promise<TickerItem[]> {
  const c = await col();
  const docs = await c.find().sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map((d) => ({
    text: d.text,
    actorName: d.actorName,
    createdAt: d.createdAt.toISOString(),
  }));
}
