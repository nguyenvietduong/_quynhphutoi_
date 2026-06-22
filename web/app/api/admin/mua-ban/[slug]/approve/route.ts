import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin-guard";
import { approveClassified, getClassifiedBySlug } from "@/lib/classifieds";
import { notifyUser } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await requirePerm("mua-ban", "edit");
  if (g instanceof NextResponse) return g;
  const { slug } = await params;
  const ad = await getClassifiedBySlug(slug);
  if (!ad) return NextResponse.json({ error: "Không tìm thấy tin." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const approved = body.approved !== false;
  await approveClassified(slug, approved, approved ? { id: g.user._id!.toString(), name: g.user.name } : undefined);
  if (approved) {
    await notifyUser(ad.postedBy, { type: "post_approved", title: `Tin mua bán “${ad.title}” của bạn đã được duyệt`, href: `/mua-ban/${slug}`, module: "mua-ban" });
  }
  return NextResponse.json({ ok: true, approved });
}
