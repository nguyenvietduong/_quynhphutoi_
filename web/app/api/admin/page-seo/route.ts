// Admin: đọc (GET) & cập nhật (PATCH) SEO từng trang.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getPageSeoConfig, setPageSeoConfig, type PageSeoConfig } from "@/lib/page-seo";

export async function GET() {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const config = await getPageSeoConfig();
  return NextResponse.json({ config });
}

export async function PATCH(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;
  const b = await req.json().catch(() => ({}));
  const config = await setPageSeoConfig((b?.config ?? {}) as PageSeoConfig);
  return NextResponse.json({ ok: true, config });
}
