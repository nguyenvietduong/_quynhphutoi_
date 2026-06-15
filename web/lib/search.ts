// Tìm kiếm toàn cục — quét MỌI phân hệ. So khớp không phân biệt dấu (Việt hoá)
// bằng cách chuẩn hoá NFD + bỏ dấu, nên gõ "quynh" vẫn ra "Quỳnh".
import { lostFound } from "@/lib/lostfound";
import { jobs } from "@/lib/jobs";
import { classifieds } from "@/lib/classifieds";
import { relics } from "@/lib/relics";
import { market } from "@/lib/market";
import { health } from "@/lib/health";
import { transit } from "@/lib/transit";
import { schools } from "@/lib/schools";
import { listArticles } from "@/lib/articles";
import { stripHtml } from "@/lib/strip-html";

export type SearchHit = { module: string; moduleLabel: string; title: string; subtitle: string; href: string; image: string | null };
export type SearchGroup = { module: string; moduleLabel: string; hits: SearchHit[] };

// Bỏ dấu + thường hoá để so khớp.
export function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

// Danh sách phân hệ (thứ tự hiển thị) — dùng cho bộ lọc trên trang tìm kiếm.
export const SEARCH_MODULES: { slug: string; label: string; icon: string }[] = [
  { slug: "tin-tuc", label: "Tin tức", icon: "📰" },
  { slug: "tim-do-roi", label: "Tìm đồ rơi", icon: "🔎" },
  { slug: "viec-lam", label: "Việc làm", icon: "💼" },
  { slug: "mua-ban", label: "Mua bán", icon: "🏷️" },
  { slug: "di-tich", label: "Di tích", icon: "🏛️" },
  { slug: "cho", label: "Chợ", icon: "🛒" },
  { slug: "y-te", label: "Y tế", icon: "🏥" },
  { slug: "giao-thong", label: "Giao thông", icon: "🚌" },
  { slug: "truong-hoc", label: "Trường học", icon: "🎓" },
];
export const MODULE_ICON: Record<string, string> = Object.fromEntries(SEARCH_MODULES.map((m) => [m.slug, m.icon]));
const MODULES: Record<string, string> = Object.fromEntries(SEARCH_MODULES.map((m) => [m.slug, m.label]));

export async function searchAll(query: string, perModule = 6, moduleFilter?: string): Promise<{ total: number; groups: SearchGroup[] }> {
  const q = norm(query);
  if (q.length < 2) return { total: 0, groups: [] };
  const has = (txt: string) => norm(txt).includes(q);

  const groups: SearchGroup[] = [];
  const push = (module: string, hits: SearchHit[]) => {
    if (moduleFilter && moduleFilter !== module) return; // giới hạn 1 phân hệ
    if (hits.length) groups.push({ module, moduleLabel: MODULES[module], hits: hits.slice(0, perModule) });
  };

  // Chạy song song các phân hệ DB.
  const [nw, lf, jb, mb, dt, ch, yt, gt, th] = await Promise.all([
    listArticles({ status: "published", limit: 800 }).catch(() => []),
    lostFound().then((c) => c.find({ approved: true, active: true }, { projection: { slug: 1, title: 1, description: 1, categoryName: 1, images: 1 } }).limit(800).toArray()),
    jobs().then((c) => c.find({ approved: true, active: true }, { projection: { slug: 1, title: 1, company: 1, description: 1, images: 1 } }).limit(800).toArray()),
    classifieds().then((c) => c.find({ approved: true, active: true }, { projection: { slug: 1, title: 1, description: 1, priceText: 1, images: 1 } }).limit(800).toArray()),
    relics().then((c) => c.find({ active: true }, { projection: { slug: 1, name: 1, description: 1, typeLabel: 1, images: 1 } }).limit(800).toArray()),
    market().then((c) => c.find({ active: true }, { projection: { slug: 1, name: 1, description: 1, categoryLabel: 1 } }).limit(800).toArray()),
    health().then((c) => c.find({ active: true }, { projection: { slug: 1, name: 1, specialties: 1, typeLabel: 1 } }).limit(800).toArray()),
    transit().then((c) => c.find({ active: true }, { projection: { slug: 1, name: 1, typeLabel: 1 } }).limit(800).toArray()),
    schools().then((c) => c.find({ active: true }, { projection: { slug: 1, name: 1, levelLabel: 1 } }).limit(800).toArray()),
  ]);

  // Tin tức (bài viết đã xuất bản trong DB)
  push("tin-tuc", nw
    .filter((a) => has(a.title) || has(a.excerpt) || a.tags.some((t) => has(t)))
    .map((a) => ({ module: "tin-tuc", moduleLabel: MODULES["tin-tuc"], title: a.title, subtitle: a.category, href: `/tin-tuc/${a.slug}`, image: a.coverImage || null })));

  push("tim-do-roi", lf
    .filter((d) => has(d.title) || has(stripHtml(d.description || "")) || has(d.categoryName || ""))
    .map((d) => ({ module: "tim-do-roi", moduleLabel: MODULES["tim-do-roi"], title: d.title, subtitle: d.categoryName || "Tìm đồ rơi", href: `/tim-do-roi/${d.slug}`, image: d.images?.[0] ?? null })));

  push("viec-lam", jb
    .filter((d) => has(d.title) || has(d.company || "") || has(stripHtml(d.description || "")))
    .map((d) => ({ module: "viec-lam", moduleLabel: MODULES["viec-lam"], title: d.title, subtitle: d.company || "Việc làm", href: `/viec-lam/${d.slug}`, image: d.images?.[0] ?? null })));

  push("mua-ban", mb
    .filter((d) => has(d.title) || has(stripHtml(d.description || "")))
    .map((d) => ({ module: "mua-ban", moduleLabel: MODULES["mua-ban"], title: d.title, subtitle: d.priceText || "Mua bán", href: `/mua-ban/${d.slug}`, image: d.images?.[0] ?? null })));

  push("di-tich", dt
    .filter((d) => has(d.name) || has(d.description || "") || has(d.typeLabel || ""))
    .map((d) => ({ module: "di-tich", moduleLabel: MODULES["di-tich"], title: d.name, subtitle: d.typeLabel || "Di tích", href: `/di-tich/${d.slug}`, image: d.images?.[0] ?? null })));

  push("cho", ch
    .filter((d) => has(d.name) || has(d.description || "") || has(d.categoryLabel || ""))
    .map((d) => ({ module: "cho", moduleLabel: MODULES["cho"], title: d.name, subtitle: d.categoryLabel || "Chợ", href: `/cho/${d.slug}`, image: null })));

  push("y-te", yt
    .filter((d) => has(d.name) || has(d.specialties || "") || has(d.typeLabel || ""))
    .map((d) => ({ module: "y-te", moduleLabel: MODULES["y-te"], title: d.name, subtitle: d.typeLabel || "Y tế", href: `/y-te/${d.slug}`, image: null })));

  push("giao-thong", gt
    .filter((d) => has(d.name) || has(d.typeLabel || ""))
    .map((d) => ({ module: "giao-thong", moduleLabel: MODULES["giao-thong"], title: d.name, subtitle: d.typeLabel || "Tuyến", href: `/giao-thong/${d.slug}`, image: null })));

  push("truong-hoc", th
    .filter((d) => has(d.name) || has(d.levelLabel || ""))
    .map((d) => ({ module: "truong-hoc", moduleLabel: MODULES["truong-hoc"], title: d.name, subtitle: d.levelLabel || "Trường học", href: `/truong-hoc/${d.slug}`, image: null })));

  const total = groups.reduce((s, g) => s + g.hits.length, 0);
  return { total, groups };
}
