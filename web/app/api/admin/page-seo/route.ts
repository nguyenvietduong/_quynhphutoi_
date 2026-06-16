// Admin: đọc (GET) & cập nhật (PATCH) SEO từng trang.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getPageSeoConfig, setPageSeoConfig, setPageSeoOverride, type PageSeoConfig, type PageSeoOverride } from "@/lib/page-seo";

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
  // Hai chế độ: lưu 1 trang (key + override, gộp) HOẶC lưu toàn bộ (config).
  if (typeof b?.key === "string") {
    const config = await setPageSeoOverride(b.key, (b.override ?? {}) as PageSeoOverride);
    return NextResponse.json({ ok: true, config });
  }
  const config = await setPageSeoConfig((b?.config ?? {}) as PageSeoConfig);
  return NextResponse.json({ ok: true, config });
}
