// Admin: quản lý thông báo broadcast.
//   GET  → danh sách draft / đã gửi
//   POST → lưu draft (status: "off"), chưa gửi
//   Kích hoạt (PATCH [id] status:"ok") → mới thực sự gửi tới người nhận
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";

export async function GET(_req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const db = await getDb();

  // 1. Broadcasts mới (hệ thống mới)
  const newDocs = await db.collection("broadcasts")
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  // 2. Lịch sử từ notifications cũ (type:"announcement")
  // Group theo minute-level để tránh lỗi khi batch có timestamp lệch nhau vài ms
  const legacyGroups = await db.collection("notifications").aggregate([
    { $match: { type: "announcement" } },
    { $addFields: {
      minuteKey: { $dateToString: { format: "%Y-%m-%dT%H:%M", date: "$createdAt" } },
    }},
    { $group: {
      _id: { title: "$title", href: "$href", actorName: "$actorName", minuteKey: "$minuteKey" },
      sentCount: { $sum: 1 },
      createdAt: { $min: "$createdAt" },
    }},
    { $sort: { createdAt: -1 } },
    { $limit: 100 },
  ]).toArray();

  // Tránh trùng với broadcasts mới (so theo title + minute)
  const newKeys = new Set(newDocs.map((d) => {
    const dt = d.createdAt as Date;
    return `${d.title}|${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}-${dt.getHours()}-${dt.getMinutes()}`;
  }));

  const legacy = legacyGroups
    .filter((g) => !newKeys.has(`${g._id.title}|${g._id.minuteKey}`))
    .map((g) => ({
      _id: `legacy:${g._id.minuteKey}:${g._id.title}`,
      title: g._id.title as string,
      href: (g._id.href as string) || "/thong-bao",
      audience: null,
      status: "ok" as const,
      actorName: g._id.actorName as string,
      sentCount: g.sentCount as number,
      createdAt: (g.createdAt as Date).toISOString(),
      sentAt: (g.createdAt as Date).toISOString(),
      legacy: true,
    }));

  const result = [
    ...newDocs.map((d) => ({
      _id: d._id.toString(),
      title: d.title,
      href: d.href,
      audience: d.audience,
      emails: Array.isArray(d.emails) ? d.emails : [],
      status: d.status as "ok" | "off",
      actorName: d.actorName,
      sentCount: d.sentCount ?? null,
      createdAt: (d.createdAt as Date).toISOString(),
      sentAt: d.sentAt ? (d.sentAt as Date).toISOString() : null,
      legacy: false,
    })),
    ...legacy,
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));

  const title = String(b.title || "").trim();
  if (!title) return NextResponse.json({ error: "Nhập nội dung thông báo." }, { status: 400 });
  const href = String(b.href || "").trim() || "/thong-bao";
  const audience: "all" | "admin" | "staff" | "emails" =
    ["all", "admin", "staff", "emails"].includes(b.audience) ? b.audience : "all";

  const emails: string[] = audience === "emails"
    ? (Array.isArray(b.emails) ? b.emails.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean) : [])
    : [];
  if (audience === "emails" && emails.length === 0)
    return NextResponse.json({ error: "Nhập ít nhất một địa chỉ email." }, { status: 400 });

  const db = await getDb();
  const result = await db.collection("broadcasts").insertOne({
    title,
    href,
    audience,
    emails,
    status: "off",
    actorName: g.user.name,
    sentCount: null,
    createdAt: new Date(),
    sentAt: null,
  });

  return NextResponse.json({ ok: true, id: result.insertedId.toString() });
}
