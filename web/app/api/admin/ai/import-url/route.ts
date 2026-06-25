// Nhập bài viết từ URL: tải trang, extract nội dung, dùng AI viết lại thành HTML chuẩn.
// Provider: Gemini / OpenAI / Tùy chỉnh — cấu hình tại Cài đặt → AI & nội dung.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettingsRaw } from "@/lib/settings";
import { callAi, aiReadyFor, type AiProvider } from "@/lib/ai-call";
import { logActivity } from "@/lib/activity-log";

// ── HTML helpers (không dùng thư viện ngoài) ─────────────────────────────

function getMeta(html: string, attr: string): string {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${attr}["'][^>]+content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${attr}["']`, "i");
  const m = html.match(re1) || html.match(re2);
  return m ? decodeHTMLEntities(m[1].trim()) : "";
}

function decodeHTMLEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ");
}

function getPageTitle(html: string): string {
  return getMeta(html, "og:title")
    || (() => { const m = html.match(/<title[^>]*>([^<]+)<\/title>/i); return m ? decodeHTMLEntities(m[1].trim()) : ""; })()
    || (() => { const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i); return m ? decodeHTMLEntities(m[1].trim()) : ""; })();
}

function getPageDesc(html: string): string {
  return getMeta(html, "og:description") || getMeta(html, "description");
}

function getOgImage(html: string): string {
  return getMeta(html, "og:image");
}

// Các mạng xã hội render bằng JS — body fetch về chỉ là shell page, không có nội dung bài.
const SOCIAL_HOSTNAMES = /^(www\.)?(facebook|fb|instagram|threads|twitter|x|tiktok|linkedin|zalo)\.com$/i;

function isSocial(hostname: string): boolean {
  return SOCIAL_HOSTNAMES.test(hostname);
}

function extractText(html: string): string {
  // Ưu tiên: <article> → <main> → <body>
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const main    = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const body    = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let chunk = (article?.[1] ?? main?.[1] ?? body?.[1] ?? html);

  chunk = chunk
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return chunk.slice(0, 8000);
}

// ── Route ─────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const body = await req.json().catch(() => ({}));
  const { url, provider = "gemini" } = body as { url?: string; provider?: AiProvider };

  if (!url?.trim()) return NextResponse.json({ error: "Thiếu URL." }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("protocol");
  } catch {
    return NextResponse.json({ error: "URL không hợp lệ (cần bắt đầu bằng http:// hoặc https://)." }, { status: 400 });
  }

  const social = isSocial(parsed.hostname);

  // Tải trang
  let pageHtml: string;
  try {
    const res = await fetch(parsed.href, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "vi,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return NextResponse.json({ error: `Trang trả về lỗi HTTP ${res.status}.` }, { status: 502 });
    pageHtml = await res.text();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "lỗi không xác định";
    return NextResponse.json({ error: `Không thể tải trang: ${msg}` }, { status: 502 });
  }

  const rawTitle = getPageTitle(pageHtml);
  const rawDesc  = getPageDesc(pageHtml);
  const ogImage  = getOgImage(pageHtml);

  // Mạng xã hội: chỉ dùng meta tags (body là JS shell, vô nghĩa)
  // Trang thường: extract body text
  const bodyText = social ? "" : extractText(pageHtml);

  const settings = await getSettingsRaw();
  const aiProvider: AiProvider = (provider as AiProvider) || "gemini";
  const hasAi = aiReadyFor(settings, aiProvider);

  let title    = rawTitle;
  let excerpt  = rawDesc;
  let bodyHtml = "";
  let tags     = "";
  let usedAi   = false;

  const canCallAi = hasAi && (social ? !!(rawTitle || rawDesc) : bodyText.trim().length > 100);

  if (canCallAi) {
    const socialNote = social
      ? `Lưu ý: đây là bài đăng từ ${parsed.hostname}. Trang này render bằng JavaScript nên chỉ có meta tags. Hãy dựa vào tiêu đề và mô tả để viết bài đầy đủ.`
      : "";

    const contentSection = social ? "" : `\nNội dung gốc:\n${bodyText}`;

    const prompt = `Bạn là biên tập viên của "Quỳnh Phụ Tôi" — trang thông tin cộng đồng, phi chính thức, tại xã Quỳnh Phụ, Thái Bình.
${socialNote}
Hãy chuyển thể thành bài viết chuẩn cho trang.

Trả về ĐÚNG JSON (không bọc markdown, không giải thích), cấu trúc:
{
  "title": "tiêu đề (50-100 ký tự)",
  "excerpt": "sapo/tóm tắt (120-200 ký tự, hấp dẫn, có từ khoá)",
  "bodyHtml": "nội dung HTML — chỉ dùng <h2>,<h3>,<p>,<ul>,<ol>,<li>,<strong>,<em>,<blockquote>. KHÔNG dùng <h1>",
  "tags": "3-5 tags tiếng Việt, cách nhau dấu phẩy"
}

Tiêu đề gốc: ${rawTitle || "(không có)"}
Mô tả gốc: ${rawDesc || "(không có)"}
Nguồn: ${parsed.hostname}${contentSection}

Bắt đầu JSON ngay từ dấu {`;

    try {
      let raw = await callAi(prompt, settings, aiProvider);
      raw = raw.replace(/^```json?\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const jsonStart = raw.indexOf("{");
      const jsonEnd   = raw.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const parsed2 = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
        title    = parsed2.title    || title;
        excerpt  = parsed2.excerpt  || excerpt;
        bodyHtml = parsed2.bodyHtml || "";
        tags     = parsed2.tags     || "";
        usedAi   = true;
      }
    } catch { /* fallback bên dưới */ }
  }

  // Fallback không có AI và không phải mạng xã hội
  if (!bodyHtml && bodyText) {
    bodyHtml = bodyText.split(/\n{2,}/).filter(Boolean)
      .map((p) => `<p>${p.trim()}</p>`).join("\n");
  }

  // Mạng xã hội không có AI → báo lỗi rõ ràng
  if (social && !usedAi && !bodyHtml) {
    return NextResponse.json({
      error: `Bài đăng từ ${parsed.hostname} cần AI để xử lý (trang này không cho phép đọc nội dung trực tiếp). Vào Cài đặt → AI & nội dung để cấu hình provider.`,
    }, { status: 422 });
  }

  void logActivity({
    userId: g.user._id!.toString(), userName: g.user.name, userEmail: g.user.email,
    userRole: g.user.role ?? "admin", category: "admin", action: "ai.import_url",
    target: { type: "tin-tuc", label: parsed.hostname }, success: true,
  });

  return NextResponse.json({ title, excerpt, bodyHtml, ogImage, tags, sourceUrl: parsed.href, usedAi, social });
}
