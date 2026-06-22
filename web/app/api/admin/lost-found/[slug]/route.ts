// Admin sửa nội dung / từ chối / xoá hẳn 1 tin. PATCH + DELETE.
import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin-guard";
import { deletePost, getPostBySlug, updatePost, type LostFoundPatch, type LostFoundStatus } from "@/lib/lostfound";
import { notifyUser } from "@/lib/notifications";
import { sanitizeHtml } from "@/lib/sanitize";
import { sanitizeSeoFields } from "@/lib/seo-fields";
import { isGoogleMapsUrl, resolveMapUrl } from "@/lib/map-embed";

const LF_STATUSES: LostFoundStatus[] = ["open", "matched", "resolved", "closed"];

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requirePerm("tim-do-roi", "edit");
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const b = await req.json().catch(() => ({}));

  const patch: LostFoundPatch = {};
  if (typeof b.title === "string") patch.title = b.title;
  if (typeof b.description === "string") patch.description = sanitizeHtml(b.description);
  if (typeof b.reward === "string") patch.reward = b.reward;
  if (typeof b.featured === "boolean") patch.featured = b.featured;
  if (typeof b.approved === "boolean") patch.approved = b.approved;
  if (b.status !== undefined && LF_STATUSES.includes(b.status)) patch.status = b.status;
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

  const n = await updatePost(slug, patch);
  if (!n) return NextResponse.json({ error: "Không tìm thấy tin." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const g = await requirePerm("tim-do-roi", "edit");
  if (g instanceof NextResponse) return g;

  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const deleted = await deletePost(slug);
  if (!deleted) return NextResponse.json({ error: "Không tìm thấy tin." }, { status: 404 });

  if (post) {
    await notifyUser(post.postedBy, {
      type: "post_rejected",
      title: `Tin “${post.title}” của bạn không được duyệt`,
      href: "/tai-khoan/bai-dang",
      module: "tim-do-roi",
    });
  }
  return NextResponse.json({ ok: true });
}
