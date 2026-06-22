import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { listTickerItems } from "@/lib/staff-ticker";

export async function GET() {
  const g = await requireStaff();
  if (g instanceof NextResponse) return g;
  const items = await listTickerItems(10);
  return NextResponse.json({ items });
}
