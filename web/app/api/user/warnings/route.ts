// Trả danh sách cảnh báo đang hoạt động của user hiện tại.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getActiveWarnings } from "@/lib/user-warnings";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const warnings = await getActiveWarnings(session.id);
  return NextResponse.json({ warnings });
}
