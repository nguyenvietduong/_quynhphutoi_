// Chèn transformation tối ưu vào URL ảnh Cloudinary (f_auto + q_auto + resize).
// URL KHÔNG phải Cloudinary (loremflickr, ảnh local /img/…) → trả nguyên, không đụng.
// Dùng cho cả <img> thô lẫn loader của next/image (lib/cloudinary-loader.ts).
const CLD_MARKER = "/image/upload/";

export type CldOpts = {
  w?: number;                 // chiều rộng tối đa (px) — c_limit: không phóng to quá ảnh gốc
  q?: number | "auto";        // chất lượng; mặc định "auto" (Cloudinary tự cân)
  dpr?: number | "auto";      // device pixel ratio cho màn retina
};

export function cldUrl(src: string, opts: CldOpts = {}): string {
  if (!src || !src.includes("res.cloudinary.com")) return src;
  const i = src.indexOf(CLD_MARKER);
  if (i === -1) return src;

  const head = src.slice(0, i + CLD_MARKER.length);
  const tail = src.slice(i + CLD_MARKER.length);

  const t = ["f_auto", `q_${opts.q ?? "auto"}`];
  if (opts.w) t.push(`w_${Math.round(opts.w)}`, "c_limit");
  if (opts.dpr) t.push(`dpr_${opts.dpr}`);
  const seg = t.join(",");

  // Idempotent: nếu URL đã bắt đầu bằng transform có f_auto rồi → không chèn nữa.
  if (/^[^/]*f_auto/.test(tail)) return src;
  return `${head}${seg}/${tail}`;
}

// Tối ưu tất cả <img src="..."> trong một HTML string (dùng cho dangerouslySetInnerHTML).
// Thêm f_auto,q_auto,w_{maxW} cho Cloudinary URLs và loading="lazy" nếu chưa có.
export function cldHtml(html: string, maxW = 900): string {
  if (!html) return html;
  return html.replace(
    /<img(\s[^>]*)?\s*\/?>/gi,
    (tag) => {
      const srcMatch = tag.match(/\ssrc="([^"]*)"/i);
      if (!srcMatch) return tag;
      const optimized = cldUrl(srcMatch[1], { w: maxW });
      let result = tag.replace(/\ssrc="[^"]*"/i, ` src="${optimized}"`);
      if (!/\sloading=/i.test(result)) {
        result = result.replace(/\s*\/?>$/, ' loading="lazy"$&');
      }
      return result;
    }
  );
}
