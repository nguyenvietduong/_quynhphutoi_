// Lớp lưu ảnh — đẩy lên Cloudinary nếu đã cấu hình, ngược lại ghi local public/uploads (dev).
// Cloudinary: lấy Cloud name + API Key + API Secret ở Dashboard → điền vào .env.local.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "";
const KEY = process.env.CLOUDINARY_API_KEY || "";
const SECRET = process.env.CLOUDINARY_API_SECRET || "";
const FOLDER = process.env.CLOUDINARY_FOLDER || "quynhphu";

export const usingCloudinary = !!(CLOUD && KEY && SECRET);

let _configured = false;
function ensureConfig() {
  if (!_configured) {
    cloudinary.config({ cloud_name: CLOUD, api_key: KEY, api_secret: SECRET, secure: true });
    _configured = true;
  }
}

// Lưu 1 ảnh, trả về URL công khai.
export async function saveImage(buf: Buffer, ext: string, contentType: string, subfolder?: string): Promise<string> {
  if (usingCloudinary) {
    ensureConfig();
    const folder = subfolder ? `${FOLDER}/${subfolder}` : FOLDER;
    const dataUri = `data:${contentType};base64,${buf.toString("base64")}`;
    const res = await cloudinary.uploader.upload(dataUri, { folder, resource_type: "image" });
    return res.secure_url;
  }

  // Fallback dev: ghi vào public/uploads (CHỈ chạy được khi self-host, KHÔNG dùng trên Vercel).
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${name}`;
}
