// Admin: gọi AI để sinh nội dung bài viết từ tiêu đề + tóm tắt.
// Provider: Gemini / OpenAI / Tùy chỉnh — cấu hình tại Cài đặt → AI & nội dung.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettingsRaw } from "@/lib/settings";
import { callAi, aiReadyFor, type AiProvider } from "@/lib/ai-call";
import { logActivity } from "@/lib/activity-log";

const TONE_LABELS: Record<string, string> = {
  "chinh-thong": "chính thống, trang trọng — phù hợp văn bản hành chính địa phương",
  "than-thien": "thân thiện, gần gũi — phù hợp bài tin tức cộng đồng",
  "thong-tin": "thông tin, rõ ràng, ngắn gọn — phù hợp thông báo và hướng dẫn",
};

const LENGTH_LABELS: Record<string, string> = {
  "ngan": "400–600 chữ, 2–3 đoạn chính",
  "vua": "700–1000 chữ, 4–5 đoạn, có mục lớn nhỏ",
  "dai": "1200–1800 chữ, chi tiết đầy đủ, nhiều mục H2/H3",
};

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const body = await req.json().catch(() => ({}));
  const { title, excerpt, category, scope, tone = "chinh-thong", length = "vua", customPrompt = "", provider = "gemini" } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Thiếu tiêu đề bài viết." }, { status: 400 });

  const settings = await getSettingsRaw();
  const aiProvider = (provider as AiProvider) || "gemini";

  if (!aiReadyFor(settings, aiProvider)) {
    return NextResponse.json(
      { error: `Chưa cấu hình API key cho provider "${aiProvider}". Vào Cài đặt → AI & nội dung.` },
      { status: 400 },
    );
  }

  const scopeLabel = scope === "trong-xa" ? "Trong xã Quỳnh Phụ" : "Ngoài xã (tin trong nước / thế giới)";
  const toneLabel = TONE_LABELS[tone] ?? TONE_LABELS["chinh-thong"];
  const lengthLabel = LENGTH_LABELS[length] ?? LENGTH_LABELS["vua"];

  const prompt = `Bạn là biên tập viên nội dung của "Quỳnh Phụ Tôi" — trang thông tin cộng đồng địa phương phục vụ người dân.

Hãy viết nội dung bài viết HOÀN CHỈNH dưới dạng HTML. Chỉ trả về phần thân bài — KHÔNG có thẻ <html>, <head>, <body>, không bọc trong markdown (\`\`\`).

Chỉ dùng các thẻ: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>
KHÔNG dùng <h1> (tiêu đề đã có bên ngoài khung soạn thảo).
KHÔNG thêm lời chào, giải thích, hay văn bản ngoài HTML.

Thông tin bài viết:
- Tiêu đề: ${title.trim()}${excerpt?.trim() ? `\n- Tóm tắt / sapo: ${excerpt.trim()}` : ""}${category ? `\n- Chuyên mục: ${category}` : ""}
- Phạm vi: ${scopeLabel}
- Giọng văn: ${toneLabel}
- Độ dài mục tiêu: ${lengthLabel}${customPrompt?.trim() ? `\n- Yêu cầu thêm: ${customPrompt.trim()}` : ""}

Chỉ trả về HTML, bắt đầu ngay từ thẻ đầu tiên.`;

  try {
    let html = await callAi(prompt, settings, aiProvider);

    // Loại bỏ markdown fence nếu model vẫn bọc
    html = html.replace(/^```html?\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    if (!html) return NextResponse.json({ error: "AI không trả về nội dung." }, { status: 502 });

    void logActivity({ userId: g.user._id!.toString(), userName: g.user.name, userEmail: g.user.email, userRole: g.user.role ?? "admin", category: "admin", action: "ai.generate", target: { type: "tin-tuc", label: title }, success: true });
    return NextResponse.json({ html });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
