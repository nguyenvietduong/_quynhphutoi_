import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export type WarningDoc = {
  _id?: ObjectId;
  userId: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  module: string;
  reason: string;
  createdAt: Date;
  resolvedAt?: Date;
};

export type WarningRow = {
  id: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  module: string;
  reason: string;
  createdAt: string;
};

async function col() {
  const db = await getDb();
  return db.collection<WarningDoc>("user_warnings");
}

export async function createWarning(data: Omit<WarningDoc, "_id" | "createdAt">) {
  const c = await col();
  await c.insertOne({ ...data, createdAt: new Date() });
}

export async function getActiveWarnings(userId: string): Promise<WarningRow[]> {
  const c = await col();
  const docs = await c
    .find({ userId, resolvedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => ({
    id: d._id!.toString(),
    articleId: d.articleId,
    articleTitle: d.articleTitle,
    articleSlug: d.articleSlug,
    module: d.module,
    reason: d.reason,
    createdAt: d.createdAt.toISOString(),
  }));
}

// Trả về true nếu có warning được giải quyết (bài đó đã từng bị cảnh báo).
export async function resolveWarningByArticle(userId: string, articleId: string): Promise<boolean> {
  const c = await col();
  const res = await c.updateOne(
    { userId, articleId, resolvedAt: { $exists: false } },
    { $set: { resolvedAt: new Date() } },
  );
  return res.matchedCount > 0;
}
