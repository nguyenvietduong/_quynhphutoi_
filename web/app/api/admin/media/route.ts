import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin-guard";
import { listMedia, searchMedia, deleteMedia, cloudinaryConfigured } from "@/lib/media";

const NOT_CONFIGURED = NextResponse.json({ error: "Chưa cấu hình Cloudinary." }, { status: 503 });

export async function GET(req: Request) {
  const g = await requirePerm("media", "view");
  if (g instanceof NextResponse) return g;
  if (!cloudinaryConfigured) return NOT_CONFIGURED;

  const { searchParams } = new URL(req.url);
  const q         = searchParams.get("q")?.trim() ?? "";
  const cursor    = searchParams.get("cursor") ?? undefined;
  const subfolder = searchParams.get("subfolder")?.trim() || undefined;

  try {
    const result = q
      ? await searchMedia(q, cursor, subfolder)
      : await listMedia({ cursor, subfolder });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi Cloudinary.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const g = await requirePerm("media", "full");
  if (g instanceof NextResponse) return g;
  if (!cloudinaryConfigured) return NOT_CONFIGURED;

  const body = await req.json().catch(() => ({}));
  const publicId = String(body.publicId ?? "").trim();
  if (!publicId) return NextResponse.json({ error: "Thiếu publicId." }, { status: 400 });

  try {
    await deleteMedia(publicId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Xoá thất bại.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
