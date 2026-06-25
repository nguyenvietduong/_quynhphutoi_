// Upload ảnh — đẩy lên Cloudinary (nếu cấu hình) hoặc lưu local public/uploads. Cần đăng nhập.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveImage } from "@/lib/storage";
import { rateLimit, tooMany } from "@/lib/ratelimit";
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB, MAX_FILES_PER_UPLOAD, isAllowedImageType } from "@/lib/upload-limits";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  // Chống lạm dụng (đầy đĩa / đốt dung lượng Cloudinary): giới hạn theo user.
  const burst = await rateLimit(`upload:burst:${session.id}`, 20, 600); // 20 request / 10 phút
  if (!burst.ok) return tooMany(burst.retryAfter, "Bạn tải ảnh quá nhanh. Vui lòng thử lại sau.");
  const daily = await rateLimit(`upload:day:${session.id}`, 200, 86_400); // 200 request / ngày
  if (!daily.ok) return tooMany(daily.retryAfter, "Bạn đã đạt giới hạn tải ảnh trong ngày.");

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "Chưa chọn ảnh." }, { status: 400 });

  const subfolder = form.get("subfolder")?.toString().trim() || undefined;

  const urls: string[] = [];
  for (const f of files.slice(0, MAX_FILES_PER_UPLOAD)) {
    if (!isAllowedImageType(f.type)) return NextResponse.json({ error: "Chỉ chấp nhận ảnh JPG/PNG/WEBP/GIF." }, { status: 400 });
    if (f.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: `Mỗi ảnh tối đa ${MAX_IMAGE_MB}MB.` }, { status: 400 });
    const ext = (f.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const url = await saveImage(Buffer.from(await f.arrayBuffer()), ext, f.type, subfolder);
    urls.push(url);
  }
  return NextResponse.json({ urls });
}
