import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin";
import { isAdmin } from "@/lib/users";
import { deleteClassified, getClassifiedBySlug, updateClassified, type ClassifiedPatch, type ClassifiedStatus } from "@/lib/classifieds";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { notifyUser } from "@/lib/notifications";
import { sanitizeHtml } from "@/lib/sanitize";
import { isGoogleMapsUrl, resolveMapUrl } from "@/lib/map-embed";

const CL_STATUSES: ClassifiedStatus[] = ["open", "sold", "closed"];

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Chỉ admin." }, { status: 403 });
  const { slug } = await params;
  const b = await req.json().catch(() => ({}));

  const patch: ClassifiedPatch = {};
  if (typeof b.title === "string") patch.title = b.title;
  if (typeof b.description === "string") patch.description = sanitizeHtml(b.description);
  if (typeof b.priceText === "string") patch.priceText = b.priceText;
  if (typeof b.featured === "boolean") patch.featured = b.featured;
  if (typeof b.approved === "boolean") patch.approved = b.approved;
  if (b.status !== undefined && CL_STATUSES.includes(b.status)) patch.status = b.status;
  if (Array.isArray(b.images)) patch.images = b.images.filter((x: unknown) => typeof x === "string").slice(0, 12);
  if (typeof b.address === "string") patch["location.address"] = b.address.trim();
  if (typeof b.mapUrl === "string") {
    const raw = b.mapUrl.trim();
    if (raw && (raw.length > 500 || !isGoogleMapsUrl(raw))) {
      return NextResponse.json({ error: "Link Google Maps không hợp lệ." }, { status: 400 });
    }
    patch["location.mapUrl"] = raw ? await resolveMapUrl(raw) : "";
  }
  if ("seo" in b) patch.seo = sanitizeSeoFields(b.seo);

  const n = await updateClassified(slug, patch);
  if (!n) return NextResponse.json({ error: "Không tìm thấy tin." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Chỉ admin mới được xoá tin." }, { status: 403 });
  const { slug } = await params;
  const ad = await getClassifiedBySlug(slug);
  const deleted = await deleteClassified(slug);
  if (!deleted) return NextResponse.json({ error: "Không tìm thấy tin." }, { status: 404 });
  if (ad) {
    await notifyUser(ad.postedBy, { type: "post_rejected", title: `Tin mua bán “${ad.title}” của bạn không được duyệt`, href: "/tai-khoan/bai-dang", module: "mua-ban" });
  }
  return NextResponse.json({ ok: true });
}
