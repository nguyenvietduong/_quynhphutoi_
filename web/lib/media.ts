// Quản lý media trên Cloudinary — list, search, delete, rename (migration).
// Chỉ dùng phía server (API routes / Server Components).
import { v2 as cloudinary } from "cloudinary";
export { MODULE_SUBFOLDER, MODULE_LABELS } from "@/lib/media-modules";

const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME || "";
const KEY    = process.env.CLOUDINARY_API_KEY    || "";
const SECRET = process.env.CLOUDINARY_API_SECRET || "";
export const FOLDER = process.env.CLOUDINARY_FOLDER || "quynhphu";

export const cloudinaryConfigured = !!(CLOUD && KEY && SECRET);

let _ready = false;
function ensureConfig() {
  if (!_ready) {
    cloudinary.config({ cloud_name: CLOUD, api_key: KEY, api_secret: SECRET, secure: true });
    _ready = true;
  }
}

export type MediaAsset = {
  publicId: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  createdAt: string;
};

function toAsset(r: Record<string, unknown>): MediaAsset {
  return {
    publicId:  String(r.public_id  ?? ""),
    url:       String(r.secure_url ?? r.url ?? ""),
    width:     Number(r.width  ?? 0),
    height:    Number(r.height ?? 0),
    format:    String(r.format ?? ""),
    bytes:     Number(r.bytes  ?? 0),
    createdAt: String(r.created_at ?? ""),
  };
}

export async function listMedia(opts: { cursor?: string; maxResults?: number; subfolder?: string } = {}): Promise<{ assets: MediaAsset[]; nextCursor?: string; total: number }> {
  ensureConfig();
  const prefix = opts.subfolder ? `${FOLDER}/${opts.subfolder}` : FOLDER;
  const res = await cloudinary.api.resources({
    type: "upload",
    prefix,
    max_results: opts.maxResults ?? 30,
    next_cursor: opts.cursor,
  });
  return {
    assets: (res.resources as Record<string, unknown>[]).map(toAsset),
    nextCursor: (res.next_cursor as string | undefined) ?? undefined,
    total: Number(res.rate_limit_remaining ?? 0),
  };
}

export async function searchMedia(query: string, cursor?: string, subfolder?: string): Promise<{ assets: MediaAsset[]; nextCursor?: string }> {
  ensureConfig();
  const folderPrefix = subfolder ? `${FOLDER}/${subfolder}` : FOLDER;
  let expr = `folder:${folderPrefix}`;
  if (query.trim()) expr += ` AND filename:*${query.trim()}*`;
  const res = await cloudinary.search
    .expression(expr)
    .sort_by("created_at", "desc")
    .max_results(30)
    .next_cursor(cursor ?? "")
    .execute();
  return {
    assets: ((res.resources ?? []) as Record<string, unknown>[]).map(toAsset),
    nextCursor: (res.next_cursor as string | undefined) ?? undefined,
  };
}

export async function deleteMedia(publicId: string): Promise<void> {
  ensureConfig();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

// Đổi tên asset trên Cloudinary, trả về URL mới.
export async function renameMedia(fromPublicId: string, toPublicId: string): Promise<string> {
  ensureConfig();
  const res = await cloudinary.uploader.rename(fromPublicId, toPublicId, { overwrite: false }) as Record<string, unknown>;
  return String(res.secure_url ?? "");
}

// Lấy public_id từ Cloudinary URL.
// VD: https://res.cloudinary.com/cloud/image/upload/v1234/quynhphu/abc.jpg → quynhphu/abc
export function extractPublicId(url: string): string | null {
  const clean = url.split("?")[0];
  const m = clean.match(/\/image\/upload\/(?:v\d+\/)?(.+)$/);
  if (!m) return null;
  return m[1].replace(/\.[a-z0-9]{1,5}$/i, "");
}

// Trả về true nếu URL là ảnh Cloudinary trong folder gốc (chưa vào sub-folder module nào).
export function isRootAsset(url: string): boolean {
  if (!url.startsWith("https://res.cloudinary.com/")) return false;
  const pid = extractPublicId(url);
  if (!pid || !pid.startsWith(FOLDER + "/")) return false;
  const rest = pid.slice(FOLDER.length + 1);
  return !rest.includes("/");
}

// Tính public_id mới khi di chuyển vào subfolder.
export function migratedPublicId(url: string, subfolder: string): string | null {
  const pid = extractPublicId(url);
  if (!pid) return null;
  const filename = pid.slice(FOLDER.length + 1);
  return `${FOLDER}/${subfolder}/${filename}`;
}
