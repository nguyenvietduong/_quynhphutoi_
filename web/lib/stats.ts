// Tổng hợp số liệu cho dashboard quản trị (đếm + chuỗi thời gian).
import { getDb } from "@/lib/db";

const DAY = 86_400_000;

export type DayPoint = { date: string; jobs: number; lostfound: number; classifieds: number; articles: number; total: number };

// Số tin/bài đăng mới mỗi ngày trong `days` ngày gần nhất (4 phân hệ + tổng).
export async function dailyNewCounts(days = 14): Promise<DayPoint[]> {
  const db = await getDb();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setTime(since.getTime() - (days - 1) * DAY);

  const sources: { coll: string; key: "jobs" | "lostfound" | "classifieds" | "articles" }[] = [
    { coll: "jobs", key: "jobs" },
    { coll: "lost_found", key: "lostfound" },
    { coll: "classifieds", key: "classifieds" },
    { coll: "articles", key: "articles" },
  ];

  const buckets = new Map<string, DayPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * DAY);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, jobs: 0, lostfound: 0, classifieds: 0, articles: 0, total: 0 });
  }

  await Promise.all(sources.map(async ({ coll, key }) => {
    const rows = await db.collection(coll).aggregate<{ _id: string; n: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
    ]).toArray();
    for (const r of rows) {
      const b = buckets.get(r._id);
      if (b) { b[key] = r.n; b.total += r.n; }
    }
  }));

  return [...buckets.values()];
}

// Số người dùng mới đăng ký mỗi ngày trong `days` ngày gần nhất.
export type UserDayPoint = { date: string; count: number };

export async function dailyUserRegistrations(days = 14): Promise<UserDayPoint[]> {
  const db = await getDb();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setTime(since.getTime() - (days - 1) * DAY);

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * DAY);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  const rows = await db.collection("users").aggregate<{ _id: string; n: number }>([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
  ]).toArray();

  for (const r of rows) {
    if (buckets.has(r._id)) buckets.set(r._id, r.n);
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

// Phiên bản linh hoạt hơn: from/to tường minh (inclusive cả hai đầu).
export async function dailyNewCountsRange(from: Date, to: Date): Promise<DayPoint[]> {
  const db    = await getDb();
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end   = new Date(to);   end.setHours(23, 59, 59, 999);
  const days  = Math.ceil((end.getTime() - start.getTime()) / DAY) + 1;

  const sources: { coll: string; key: "jobs" | "lostfound" | "classifieds" | "articles" }[] = [
    { coll: "jobs",        key: "jobs"        },
    { coll: "lost_found",  key: "lostfound"   },
    { coll: "classifieds", key: "classifieds" },
    { coll: "articles",    key: "articles"    },
  ];

  const buckets = new Map<string, DayPoint>();
  for (let i = 0; i < days; i++) {
    const d   = new Date(start.getTime() + i * DAY);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, jobs: 0, lostfound: 0, classifieds: 0, articles: 0, total: 0 });
  }

  await Promise.all(sources.map(async ({ coll, key }) => {
    const rows = await db.collection(coll).aggregate<{ _id: string; n: number }>([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
    ]).toArray();
    for (const r of rows) {
      const b = buckets.get(r._id);
      if (b) { b[key] = r.n; b.total += r.n; }
    }
  }));

  return [...buckets.values()];
}

// Tổng hợp theo tháng cho một năm (12 điểm dữ liệu).
const VI_MONTHS = ["Th.1","Th.2","Th.3","Th.4","Th.5","Th.6","Th.7","Th.8","Th.9","Th.10","Th.11","Th.12"];
export type MonthPoint = { month: number; label: string; jobs: number; lostfound: number; classifieds: number; articles: number; total: number };

export async function monthlyNewCounts(year: number): Promise<MonthPoint[]> {
  const db   = await getDb();
  const from = new Date(year, 0, 1);
  const to   = new Date(year, 11, 31, 23, 59, 59, 999);

  const sources: { coll: string; key: "jobs" | "lostfound" | "classifieds" | "articles" }[] = [
    { coll: "jobs",        key: "jobs"        },
    { coll: "lost_found",  key: "lostfound"   },
    { coll: "classifieds", key: "classifieds" },
    { coll: "articles",    key: "articles"    },
  ];

  const months = new Map<number, MonthPoint>();
  for (let m = 1; m <= 12; m++) {
    months.set(m, { month: m, label: VI_MONTHS[m - 1], jobs: 0, lostfound: 0, classifieds: 0, articles: 0, total: 0 });
  }

  await Promise.all(sources.map(async ({ coll, key }) => {
    const rows = await db.collection(coll).aggregate<{ _id: number; n: number }>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $month: "$createdAt" }, n: { $sum: 1 } } },
    ]).toArray();
    for (const r of rows) {
      const b = months.get(r._id);
      if (b) { b[key] = r.n; b.total += r.n; }
    }
  }));

  return [...months.values()];
}

// Đăng ký người dùng theo khoảng ngày linh hoạt.
export async function dailyUserRegistrationsRange(from: Date, to: Date): Promise<UserDayPoint[]> {
  const db    = await getDb();
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end   = new Date(to);   end.setHours(23, 59, 59, 999);
  const days  = Math.ceil((end.getTime() - start.getTime()) / DAY) + 1;

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  const rows = await db.collection("users").aggregate<{ _id: string; n: number }>([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
  ]).toArray();

  for (const r of rows) {
    if (buckets.has(r._id)) buckets.set(r._id, r.n);
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

// Đăng ký người dùng theo tháng cho một năm.
export async function monthlyUserRegistrations(year: number): Promise<{ month: number; count: number }[]> {
  const db   = await getDb();
  const from = new Date(year, 0, 1);
  const to   = new Date(year, 11, 31, 23, 59, 59, 999);

  const buckets = new Map<number, number>();
  for (let m = 1; m <= 12; m++) buckets.set(m, 0);

  const rows = await db.collection("users").aggregate<{ _id: number; n: number }>([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: { $month: "$createdAt" }, n: { $sum: 1 } } },
  ]).toArray();

  for (const r of rows) {
    if (buckets.has(r._id)) buckets.set(r._id, r.n);
  }

  return [...buckets.entries()].map(([month, count]) => ({ month, count }));
}

// Thống kê người dùng.
export async function userStats() {
  const db = await getDb();
  const c = db.collection("users");
  const [total, admins, verified] = await Promise.all([
    c.countDocuments({}),
    c.countDocuments({ role: "admin" }),
    c.countDocuments({ verified: true }),
  ]);
  return { total, admins, verified };
}
