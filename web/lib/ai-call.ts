// Gọi AI theo provider được chỉ định (Gemini / OpenAI / Custom OpenAI-compatible).
// Provider được chọn tại thời điểm gọi (trong modal soạn bài), không phải cố định trong settings.
import type { AppSettings } from "@/lib/settings";

export type AiProvider = "gemini" | "openai" | "custom";

export function aiReadyFor(s: AppSettings, provider: AiProvider): boolean {
  if (provider === "gemini") return !!(process.env.GEMINI_API_KEY || s.geminiApiKey);
  if (provider === "openai") return !!(process.env.OPENAI_API_KEY || s.openaiApiKey);
  if (provider === "custom") return !!(s.customAiEndpoint?.trim() && s.customAiKey?.trim());
  return false;
}

// Trả về danh sách provider đã cấu hình đủ key
export function configuredProviders(s: AppSettings): AiProvider[] {
  const all: AiProvider[] = ["gemini", "openai", "custom"];
  return all.filter((p) => aiReadyFor(s, p));
}

export function providerLabel(p: AiProvider, s?: AppSettings): string {
  if (p === "openai") return "OpenAI";
  if (p === "custom") {
    try { return s?.customAiEndpoint ? new URL(s.customAiEndpoint).hostname : "Tùy chỉnh"; } catch { return "Tùy chỉnh"; }
  }
  return "Gemini";
}

// Gọi AI với provider cụ thể — throws string message khi lỗi
export async function callAi(prompt: string, s: AppSettings, provider: AiProvider): Promise<string> {
  if (provider === "gemini") return callGemini(prompt, s);
  return callOpenAiCompat(prompt, s, provider);
}

// ── Gemini ────────────────────────────────────────────────────────────────

async function callGemini(prompt: string, s: AppSettings): Promise<string> {
  const key = process.env.GEMINI_API_KEY || s.geminiApiKey;
  if (!key) throw new Error("Chưa cấu hình Gemini API key. Vào Cài đặt → AI & nội dung.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.45, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(60000),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err?.error?.message as string) || `Gemini lỗi HTTP ${res.status}.`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini không trả về nội dung.");
  return text;
}

// ── OpenAI-compatible ─────────────────────────────────────────────────────

function normalizeEndpoint(base: string): string {
  const url = base.replace(/\/+$/, "");
  if (url.endsWith("/chat/completions")) return url;
  return `${url}/chat/completions`;
}

async function callOpenAiCompat(prompt: string, s: AppSettings, provider: AiProvider): Promise<string> {
  let endpoint: string;
  let key: string;
  let model: string;

  if (provider === "openai") {
    endpoint = "https://api.openai.com/v1/chat/completions";
    key = process.env.OPENAI_API_KEY || s.openaiApiKey || "";
    model = s.openaiModel || "gpt-4o-mini";
    if (!key) throw new Error("Chưa cấu hình OpenAI API key. Vào Cài đặt → AI & nội dung.");
  } else {
    if (!s.customAiEndpoint?.trim()) throw new Error("Chưa cấu hình endpoint AI tùy chỉnh. Vào Cài đặt → AI & nội dung.");
    if (!s.customAiKey?.trim()) throw new Error("Chưa cấu hình API key cho AI tùy chỉnh. Vào Cài đặt → AI & nội dung.");
    endpoint = normalizeEndpoint(s.customAiEndpoint.trim());
    key = s.customAiKey.trim();
    model = s.customAiModel?.trim() || "default";
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.45,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err?.error?.message as string) || `AI lỗi HTTP ${res.status}.`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("AI không trả về nội dung.");
  return text;
}
