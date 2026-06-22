import { NextResponse } from "next/server";
import { findByEmail, checkPassword, normEmail } from "@/lib/users";
import { createSession } from "@/lib/auth";
import { rateLimit, tooMany, clientIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body;

  // Chống dò mật khẩu: giới hạn theo IP và theo email.
  const ip = clientIp(req);
  const ipRl = await rateLimit(`login:ip:${ip}`, 15, 900); // 15 lần / 15 phút / IP
  if (!ipRl.ok) return tooMany(ipRl.retryAfter, "Thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.");
  if (email) {
    const emRl = await rateLimit(`login:em:${normEmail(String(email))}`, 6, 900); // 6 lần / 15 phút / email
    if (!emRl.ok) return tooMany(emRl.retryAfter, "Tài khoản tạm khoá đăng nhập do thử sai nhiều lần. Vui lòng thử lại sau ít phút.");
  }

  const u = await findByEmail(email || "");
  if (!u || !(await checkPassword(u, password || ""))) {
    return NextResponse.json({ error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
  }
  if (u.banned) {
    return NextResponse.json({ error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên." }, { status: 403 });
  }

  await createSession({ id: String(u._id), email: u.email, name: u.name, avatar: u.avatar || "" });
  return NextResponse.json({ ok: true });
}
