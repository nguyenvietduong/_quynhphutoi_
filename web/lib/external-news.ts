// Lấy tin từ API NGOÀI (mặc định NewsAPI.org) để admin xem trước & tạo nhanh bản nháp.
// Chỉ chạy ở server (route handler). Cấu hình lấy từ admin Settings (DB) TRƯỚC, sau đó
// fallback về env (NEWS_API_KEY/NEWS_API_URL/NEWS_API_QUERY). Không có khoá = tính năng tắt.
import { getSettingsRaw } from "@/lib/settings";

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
const DEFAULT_QUERY = "Quỳnh Phụ";

// Gộp cấu hình từ admin Settings (DB) + env. DB ưu tiên; env là fallback.
async function resolveConfig() {
  const s = await getSettingsRaw().catch(() => null);
  const key = (s?.newsApiKey || process.env.NEWS_API_KEY || "").trim();
  const base = (s?.newsApiUrl || process.env.NEWS_API_URL || DEFAULT_URL).trim();
  const query = (s?.newsApiQuery || process.env.NEWS_API_QUERY || DEFAULT_QUERY).trim();
  const enabled = (s ? s.newsImportEnabled : true) && !!key;
  return { key, base, query, enabled };
}

// Đã bật + có khoá chưa? Dùng để ẩn/hiện nút ở trang admin (server-side).
export async function externalNewsConfigured(): Promise<boolean> {
  return (await resolveConfig()).enabled;
}

// Gọi NewsAPI và chuẩn hoá kết quả về ExternalNewsItem[]. Ném lỗi (message tiếng Việt)
// khi thiếu key hoặc nguồn trả lỗi — route sẽ bắt và trả 400.
export async function fetchExternalNews(q?: string, pageSize = 30): Promise<ExternalNewsItem[]> {
  const { key, base, query: defaultQuery } = await resolveConfig();
  if (!key) throw new Error("Chưa cấu hình khoá API nguồn tin (admin Cài đặt → Nguồn tin ngoài).");

  const query = (q && q.trim()) || defaultQuery;

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
