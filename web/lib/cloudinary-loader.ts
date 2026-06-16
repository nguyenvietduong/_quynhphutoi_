"use client";
// Loader ảnh cho next/image — áp dụng TOÀN BỘ <Image>.
// Ảnh Cloudinary → trỏ thẳng CDN Cloudinary kèm f_auto,q_auto,w (bỏ hop qua /_next/image của Vercel).
// Ảnh khác (local /img/…, loremflickr) → trả nguyên src, trình duyệt tải trực tiếp.
import { cldUrl } from "@/lib/cloudinary-url";

export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return cldUrl(src, { w: width, q: quality ?? "auto" });
}
