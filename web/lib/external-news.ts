// Lấy tin từ NGUỒN NGOÀI để admin xem trước & tạo nhanh bản nháp. Hỗ trợ 3 nguồn:
//   - "rss"    : RSS các báo VN (miễn phí, không cần khoá, chạy được trên production) — MẶC ĐỊNH.
//   - "gnews"  : GNews.io (cần khoá; gói free 100 req/ngày, CHẠY ĐƯỢC production server-side).
//   - "newsapi": NewsAPI.org (cần khoá; gói free chỉ chạy localhost, không dùng được production).
// Chỉ chạy ở server (route handler). Cấu hình lấy từ admin Settings (DB) TRƯỚC, sau đó
// fallback về env (NEWS_API_KEY/NEWS_API_URL/NEWS_API_QUERY/GNEWS_API_KEY) cho 2 chế độ có khoá.
import { getSettingsRaw } from "@/lib/settings";
import { stripHtml } from "@/lib/strip-html";

export type ExternalNewsItem = {
  id: string;          // định danh duy nhất (dùng url bài gốc)
  title: string;
  description: string;
  url: string;         // link bài gốc
  image: string;       // ảnh minh hoạ (http) hoặc rỗng
  source: string;      // tên nguồn báo
  publishedAt: string; // ISO
};

const DEFAULT_URL = "https://newsapi.org/v2/everything";
const GNEWS_SEARCH_URL = "https://gnews.io/api/v4/search";
const GNEWS_HEADLINES_URL = "https://gnews.io/api/v4/top-headlines";
const DEFAULT_QUERY = "Quỳnh Phụ";
const FETCH_TIMEOUT_MS = 8000;

// Gộp cấu hình từ admin Settings (DB) + env. DB ưu tiên; env là fallback.
async function resolveConfig() {
  const s = await getSettingsRaw().catch(() => null);
  const sourceType =
    s?.newsSourceType === "newsapi" ? "newsapi" : s?.newsSourceType === "gnews" ? "gnews" : "rss";
  const feeds = (s?.newsRssFeeds || "")
    .split(/[\r\n,]+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u));
  const key = (s?.newsApiKey || process.env.NEWS_API_KEY || "").trim();
  const base = (s?.newsApiUrl || process.env.NEWS_API_URL || DEFAULT_URL).trim();
  const gnewsKey = (s?.newsGnewsKey || process.env.GNEWS_API_KEY || "").trim();
  // Để TRỐNG là hợp lệ: GNews sẽ lấy top-headlines VN. (NewsAPI mới cần fallback — xử lý ở dưới.)
  const query = (s?.newsApiQuery || process.env.NEWS_API_QUERY || "").trim();
  const importOn = s ? s.newsImportEnabled : true;
  const hasSource =
    sourceType === "rss" ? feeds.length > 0 : sourceType === "gnews" ? !!gnewsKey : !!key;
  const enabled = importOn && hasSource;
  return { sourceType, feeds, key, base, gnewsKey, query, enabled };
}

// Đã bật + có cấu hình hợp lệ chưa? Dùng để ẩn/hiện nút ở trang admin (server-side).
export async function externalNewsConfigured(): Promise<boolean> {
  return (await resolveConfig()).enabled;
}

// Chuẩn hoá chuỗi để so khớp từ khoá: bỏ dấu tiếng Việt + thường hoá.
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
}

// fetch có timeout để 1 feed treo không kéo dài cả lượt.
async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; QuynhPhuBot/1.0)" },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

// Điểm vào chung: rẽ nhánh theo nguồn đã cấu hình. Ném lỗi (tiếng Việt) khi thất bại.
export async function fetchExternalNews(q?: string, pageSize = 30): Promise<ExternalNewsItem[]> {
  const cfg = await resolveConfig();
  if (cfg.sourceType === "rss") return fetchFromRss(cfg.feeds, q, pageSize);
  // GNews: query rỗng → top-headlines tin mới nhất VN (không ép từ khoá).
  if (cfg.sourceType === "gnews") return fetchFromGnews(cfg.gnewsKey, (q && q.trim()) || cfg.query, pageSize);
  // NewsAPI /everything BẮT BUỘC có q → rỗng thì dùng từ khoá mặc định.
  return fetchFromNewsApi(cfg.key, cfg.base, (q && q.trim()) || cfg.query || DEFAULT_QUERY, pageSize);
}

// ---- Nguồn RSS (báo VN) -----------------------------------------------------

async function fetchFromRss(feeds: string[], q?: string, pageSize = 30): Promise<ExternalNewsItem[]> {
  if (!feeds.length) throw new Error("Chưa cấu hình link RSS nào (admin Cài đặt → Nguồn tin ngoài).");

  const results = await Promise.allSettled(feeds.map((f) => fetchText(f)));
  const ok = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled");
  if (!ok.length) throw new Error("Không tải được link RSS nào. Kiểm tra lại danh sách RSS trong Cài đặt.");

  const seen = new Set<string>();
  let items: ExternalNewsItem[] = [];
  for (const r of ok) {
    for (const it of parseRss(r.value)) {
      if (seen.has(it.url)) continue;
      seen.add(it.url);
      items.push(it);
    }
  }

  const needle = (q || "").trim();
  if (needle) {
    const nf = fold(needle);
    items = items.filter((it) => fold(`${it.title} ${it.description}`).includes(nf));
  }

  items.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  return items.slice(0, Math.min(Math.max(pageSize, 1), 100));
}

// Giải mã CDATA + các entity XML phổ biến.
function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .trim();
}

const tag = (xml: string, name: string): string => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeXml(m[1]) : "";
};

// Tìm URL ảnh: enclosure / media:content / media:thumbnail / <img src> trong description.
function pickImage(itemXml: string, description: string): string {
  const attr = (re: RegExp) => {
    const m = itemXml.match(re);
    return m ? m[1] : "";
  };
  const url =
    attr(/<enclosure[^>]*\burl=["']([^"']+)["'][^>]*>/i) ||
    attr(/<media:content[^>]*\burl=["']([^"']+)["'][^>]*>/i) ||
    attr(/<media:thumbnail[^>]*\burl=["']([^"']+)["'][^>]*>/i) ||
    (description.match(/<img[^>]*\bsrc=["']([^"']+)["']/i)?.[1] ?? "");
  return /^https?:\/\//i.test(url) ? url : "";
}

// Parse RSS 2.0 → ExternalNewsItem[] (regex, zero-dep — đúng tinh thần lib/strip-html.ts).
function parseRss(xml: string): ExternalNewsItem[] {
  const channelTitle = tag(xml.split(/<item[\s>]/i)[0] || "", "title");
  const out: ExternalNewsItem[] = [];
  const itemRe = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const itemXml = m[1];
    const title = tag(itemXml, "title");
    const link = tag(itemXml, "link") || tag(itemXml, "guid");
    if (!title || !/^https?:\/\//i.test(link)) continue;
    const rawDesc = tag(itemXml, "description") || tag(itemXml, "content:encoded");
    const pub = tag(itemXml, "pubDate") || tag(itemXml, "dc:date");
    let publishedAt = "";
    if (pub) {
      const d = new Date(pub);
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    out.push({
      id: link,
      title: stripHtml(title),
      description: stripHtml(rawDesc).slice(0, 500),
      url: link,
      image: pickImage(itemXml, rawDesc),
      source: stripHtml(channelTitle),
      publishedAt,
    });
  }
  return out;
}

// ---- Nguồn GNews.io (free 100 req/ngày, chạy được production server-side) ----

async function fetchFromGnews(key: string, query: string, pageSize: number): Promise<ExternalNewsItem[]> {
  if (!key) throw new Error("Chưa cấu hình khoá API GNews (admin Cài đặt → Nguồn tin ngoài).");

  // GNews: /search cần q; không có q → /top-headlines tin mới nhất theo VN.
  const q = query.trim();
  const url = new URL(q ? GNEWS_SEARCH_URL : GNEWS_HEADLINES_URL);
  if (q) url.searchParams.set("q", q);
  else url.searchParams.set("category", "general");
  url.searchParams.set("lang", "vi");
  url.searchParams.set("country", "vn");
  url.searchParams.set("max", String(Math.min(Math.max(pageSize, 1), 100)));
  url.searchParams.set("apikey", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    const errs = (data as { errors?: unknown }).errors;
    const msg = Array.isArray(errs) && errs.length ? String(errs[0]) : `GNews trả lỗi (HTTP ${res.status}).`;
    throw new Error(msg);
  }

  const arr: unknown[] = Array.isArray((data as { articles?: unknown[] }).articles)
    ? (data as { articles: unknown[] }).articles
    : [];

  const seen = new Set<string>();
  const out: ExternalNewsItem[] = [];
  for (const raw of arr) {
    const a = raw as Record<string, unknown>;
    const title = String(a.title || "").trim();
    const link = String(a.url || "").trim();
    if (!title || !/^https?:\/\//i.test(link) || seen.has(link)) continue;
    seen.add(link);
    const img = String(a.image || "");
    const src = (a.source as { name?: unknown } | undefined)?.name;
    out.push({
      id: link,
      title,
      description: String(a.description || "").trim().slice(0, 500),
      url: link,
      image: img.startsWith("http") ? img : "",
      source: String(src || "").trim(),
      publishedAt: String(a.publishedAt || ""),
    });
  }
  return out;
}

// ---- Nguồn NewsAPI (giữ nguyên hành vi cũ) ----------------------------------

async function fetchFromNewsApi(key: string, base: string, query: string, pageSize: number): Promise<ExternalNewsItem[]> {
  if (!key) throw new Error("Chưa cấu hình khoá API nguồn tin (admin Cài đặt → Nguồn tin ngoài).");

  const url = new URL(base);
  url.searchParams.set("q", query);
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("language", "vi");
  url.searchParams.set("pageSize", String(Math.min(Math.max(pageSize, 1), 100)));

  const res = await fetch(url.toString(), { headers: { "X-Api-Key": key }, cache: "no-store" });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok || data.status === "error") {
    throw new Error(String(data.message || `Nguồn tin trả lỗi (HTTP ${res.status}).`));
  }

  const arr: unknown[] = Array.isArray((data as { articles?: unknown[] }).articles)
    ? (data as { articles: unknown[] }).articles
    : [];

  const seen = new Set<string>();
  const out: ExternalNewsItem[] = [];
  for (const raw of arr) {
    const a = raw as Record<string, unknown>;
    const title = String(a.title || "").trim();
    const link = String(a.url || "").trim();
    if (!title || !link || seen.has(link)) continue;
    seen.add(link);
    const img = String(a.urlToImage || "");
    const src = (a.source as { name?: unknown } | undefined)?.name;
    out.push({
      id: link,
      title,
      description: String(a.description || "").trim(),
      url: link,
      image: img.startsWith("http") ? img : "",
      source: String(src || "").trim(),
      publishedAt: String(a.publishedAt || ""),
    });
  }
  return out;
}
