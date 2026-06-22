// Admin: cập nhật trạng thái (PATCH) & xoá (DELETE) một broadcast.
// PATCH { status: "ok" } → nếu chưa từng gửi → gửi ngay + cập nhật sentAt.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID không hợp lệ." }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  const newStatus: "ok" | "off" = b.status === "ok" ? "ok" : "off";

  const db = await getDb();
  const doc = await db.collection("broadcasts").findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });

  const update: Record<string, unknown> = { status: newStatus };
  let sentCount: number | null = doc.sentCount ?? null;

  // Chỉ gửi khi chuyển sang "ok" lần đầu (chưa từng gửi).
  if (newStatus === "ok" && doc.sentAt == null) {
    const actorId = g.user._id!.toString();
    const actorName = g.user.name;
    const { broadcastToAll, notifyStaff, notifyMany } = await import("@/lib/notifications");
    const { addTickerItem } = await import("@/lib/staff-ticker");

    if (doc.audience === "emails") {
      const emailList: string[] = Array.isArray(doc.emails) ? doc.emails : [];
      const users = await db.collection("users")
        .find({ email: { $in: emailList } }, { projection: { _id: 1 } })
        .toArray();
      await notifyMany(
        users.map((u) => u._id),
        { type: "announcement", title: doc.title, href: doc.href, actorName },
        actorId,
      );
      sentCount = users.length;
    } else if (doc.audience === "staff") {
      await notifyStaff(
        { type: "announcement", title: doc.title, href: doc.href, actorName },
        actorId,
      );
      await addTickerItem(doc.title, actorName);
      sentCount = await db.collection("users").countDocuments({ role: { $in: ["admin", "editor"] } });
    } else {
      sentCount = await broadcastToAll(
        { type: "announcement", title: doc.title, href: doc.href, actorName },
        { adminsOnly: doc.audience === "admin" },
        actorId,
      );
    }
    update.sentAt = new Date();
    update.sentCount = sentCount;
  }

  await db.collection("broadcasts").updateOne({ _id: new ObjectId(id) }, { $set: update });
  return NextResponse.json({ ok: true, status: newStatus, sentCount });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID không hợp lệ." }, { status: 400 });

  const db = await getDb();
  const result = await db.collection("broadcasts").deleteOne({ _id: new ObjectId(id) });
  if (!result.deletedCount) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
