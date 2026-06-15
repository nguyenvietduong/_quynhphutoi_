// SEO TỪNG TRANG — admin chỉnh riêng cho mỗi trang client (tách khỏi SEO toàn site
// ở lib/settings.ts). Lưu 1 document _id="pages" trong collection "page_seo":
//   pages: { "/tin-tuc": { title?, description?, keywords?, ogImage?, noindex? }, ... }
// Mỗi trang gọi pageMetadata({...}) với GIÁ TRỊ MẶC ĐỊNH inline; nếu admin có nhập
// override cho trang đó thì override thắng (ô trống = giữ mặc định của trang).
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";

export type PageSeoOverride = {
  title?: string;
  description?: string;
  keywords?: string;   // các từ khoá, cách nhau dấu phẩy (lưu nguyên chuỗi)
  ogImage?: string;    // URL ảnh chia sẻ (tương đối /… hoặc http)
  noindex?: boolean;   // true = ẩn khỏi Google cho riêng trang này
};
export type PageSeoConfig = Record<string, PageSeoOverride>;

// Danh sách trang quản lý SEO (thứ tự + nhãn hiển thị ở admin).
export const PAGE_SEO_DEFS: { key: string; label: string }[] = [
  { key: "/tin-tuc", label: "Tin tức" },
  { key: "/viec-lam", label: "Việc làm" },
  { key: "/mua-ban", label: "Mua bán" },
  { key: "/tim-do-roi", label: "Tìm đồ rơi" },
  { key: "/truong-hoc", label: "Trường học" },
  { key: "/y-te", label: "Y tế" },
  { key: "/giao-thong", label: "Giao thông" },
  { key: "/di-tich", label: "Di tích" },
  { key: "/cho", label: "Chợ" },
  { key: "/tong-quan", label: "Tổng quan" },
  { key: "/sap-nhap", label: "Sáp nhập 2025" },
  { key: "/lien-he", label: "Liên hệ" },
  { key: "/quang-cao", label: "Quảng cáo" },
];
export const PAGE_SEO_KEYS = PAGE_SEO_DEFS.map((d) => d.key);

type PageSeoDoc = { _id: string; pages: PageSeoConfig };

async function col() {
  const db = await getDb();
  return db.collection<PageSeoDoc>("page_seo");
}

export async function getPageSeoConfig(): Promise<PageSeoConfig> {
  try {
    const doc = await (await col()).findOne({ _id: "pages" });
    return doc?.pages ?? {};
  } catch {
    return {};
  }
}

const str = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

// Lưu override — chỉ giữ key hợp lệ, bỏ field rỗng, clamp độ dài.
export async function setPageSeoConfig(input: PageSeoConfig): Promise<PageSeoConfig> {
  const next: PageSeoConfig = {};
  for (const key of PAGE_SEO_KEYS) {
    const p = input[key] ?? {};
    const ov: PageSeoOverride = {};
    const title = str(p.title, 200);
    const description = str(p.description, 300);
    const keywords = str(p.keywords, 400);
    const ogImage = str(p.ogImage, 500);
    if (title) ov.title = title;
    if (description) ov.description = description;
    if (keywords) ov.keywords = keywords;
    if (ogImage) ov.ogImage = ogImage;
    if (p.noindex === true) ov.noindex = true;
    if (Object.keys(ov).length) next[key] = ov;
  }
  await (await col()).updateOne({ _id: "pages" }, { $set: { pages: next } }, { upsert: true });
  return next;
}

// Dựng Metadata cho 1 trang: mặc định inline + override từ admin (nếu có).
export async function pageMetadata(o: {
  key: string;
  path: string;
  title: string;
  description: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
}): Promise<Metadata> {
  const cfg = await getPageSeoConfig();
  const ov = cfg[o.key] ?? {};
  return buildMetadata({
    title: ov.title || o.title,
    description: ov.description || o.description,
    path: o.path,
    image: ov.ogImage || o.image,
    type: o.type,
    noindex: ov.noindex ?? o.noindex,
    keywords: ov.keywords ? ov.keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
  });
}
