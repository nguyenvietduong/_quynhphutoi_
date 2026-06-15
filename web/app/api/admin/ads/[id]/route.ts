// Admin: cập nhật (PATCH) & xoá (DELETE) một quảng cáo.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin";
import { isAdmin } from "@/lib/users";
import { updateAd, deleteAd, isPlacement, type CreateAdInput } from "@/lib/ads";
import { isGoogleMapsUrl, resolveMapUrl } from "@/lib/map-embed";
import { sanitizeHtml } from "@/lib/sanitize";
import { stripHtml } from "@/lib/strip-html";
import { getSettings } from "@/lib/settings";
import { sanitizeSeoFields } from "@/lib/seo-fields";

async function guard() {
  const user = await getCurrentUser();
  if (!user) return { error: "Vui lòng đăng nhập.", status: 401 as const };
  if (!isAdmin(user)) return { error: "Chỉ admin.", status: 403 as const };
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return NextResponse.json({ error: g.error }, { status: g.status });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));

  const patch: Partial<CreateAdInput> = {};
  if (typeof b.advertiser === "string") patch.advertiser = b.advertiser.trim();
  if (typeof b.title === "string") patch.title = b.title.trim();
  if (typeof b.description === "string") {
    const html = sanitizeHtml(b.description); // khử XSS rich-text
    patch.description = stripHtml(html) ? html : undefined;
  }
  if (typeof b.imageDesktop === "string") patch.imageDesktop = b.imageDesktop.trim();
  if (typeof b.imageMobile === "string") patch.imageMobile = b.imageMobile.trim() || undefined;
  if (Array.isArray(b.images)) {
    const max = (await getSettings()).adMaxImages;
    const imgs = b.images.filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0).map((x: string) => x.trim()).slice(0, max);
    patch.images = imgs.length ? imgs : undefined;
  }
  if (typeof b.phone === "string") patch.phone = b.phone.trim() || undefined;
  if (typeof b.address === "string") patch.address = b.address.trim() || undefined;
  if (typeof b.linkUrl === "string") {
    const url = b.linkUrl.trim();
    // Link đích TUỲ CHỌN — cho phép rỗng; chỉ kiểm định khi có nhập.
    if (url && !/^https?:\/\//i.test(url)) return NextResponse.json({ error: "Link đích không hợp lệ." }, { status: 400 });
    patch.linkUrl = url;
  }
  if (typeof b.mapUrl === "string") {
    const raw = b.mapUrl.trim();
    // Link Google Maps TUỲ CHỌN — cho phép rỗng để gỡ; có nhập thì kiểm định + resolve.
    if (raw && (raw.length > 500 || !isGoogleMapsUrl(raw))) return NextResponse.json({ error: "Link Google Maps không hợp lệ." }, { status: 400 });
    patch.mapUrl = raw ? await resolveMapUrl(raw) : undefined;
  }
  if (typeof b.placement === "string" && isPlacement(b.placement)) patch.placement = b.placement;
  if (b.weight !== undefined) patch.weight = Math.max(1, Number(b.weight) || 1);
  if (b.startDate !== undefined) patch.startDate = b.startDate ? new Date(b.startDate) : null;
  if (b.endDate !== undefined) patch.endDate = b.endDate ? new Date(b.endDate) : null;
  if (typeof b.active === "boolean") patch.active = b.active;
  if ("seo" in b) patch.seo = sanitizeSeoFields(b.seo);

  await updateAd(id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return NextResponse.json({ error: g.error }, { status: g.status });
  const { id } = await params;
  const n = await deleteAd(id);
  if (!n) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
