// Khối SEO override dùng chung cho mọi module danh bạ (quảng cáo, trường học, y tế,
// giao thông, chợ, di tích). Cho phép admin GHI ĐÈ metadata tự sinh. Mọi field tuỳ chọn:
// để trống = dùng giá trị tự sinh từ nội dung. Zero-dep → import type an toàn ở client.
export type SeoFields = {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogImage?: string;
  noindex?: boolean;
};

// Làm sạch payload SEO từ request admin → SeoFields chuẩn (bỏ field rỗng). Dùng ở API route.
export function sanitizeSeoFields(raw: unknown): SeoFields | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const out: SeoFields = {};
  const s = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

  const mt = s(r.metaTitle, 200);
  const md = s(r.metaDescription, 300);
  const og = s(r.ogImage, 500);
  if (mt) out.metaTitle = mt;
  if (md) out.metaDescription = md;
  if (og) out.ogImage = og;

  let kw: string[] = [];
  if (Array.isArray(r.keywords)) kw = r.keywords.map(String);
  else if (typeof r.keywords === "string") kw = r.keywords.split(",");
  kw = kw.map((x) => x.trim()).filter(Boolean).slice(0, 20);
  if (kw.length) out.keywords = kw;

  if (typeof r.noindex === "boolean") out.noindex = r.noindex;

  return Object.keys(out).length ? out : undefined;
}

// Gộp SEO override của document vào input cho buildMetadata (lib/seo.ts).
// Override thắng giá trị tự sinh; field bỏ trống giữ nguyên giá trị gốc.
export function applySeo<
  T extends {
    title: string;
    description: string;
    image?: string | null;
    keywords?: string[];
    noindex?: boolean;
  },
>(input: T, seo?: SeoFields): T {
  if (!seo) return input;
  return {
    ...input,
    title: seo.metaTitle || input.title,
    description: seo.metaDescription || input.description,
    image: seo.ogImage || input.image,
    keywords: seo.keywords?.length ? seo.keywords : input.keywords,
    noindex: seo.noindex ?? input.noindex,
  };
}
