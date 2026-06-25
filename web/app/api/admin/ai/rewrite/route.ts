// Viết lại nội dung gốc bằng AI: nhận text thô (copy từ bất kỳ nguồn nào),
// trả về tất cả fields bài viết đã được viết lại hoàn toàn tránh đạo văn.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettingsRaw } from "@/lib/settings";
import { callAi, aiReadyFor, type AiProvider } from "@/lib/ai-call";
import { logActivity } from "@/lib/activity-log";
import { getActiveProfanityWords } from "@/lib/profanity";

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const body = await req.json().catch(() => ({}));
  const { text, provider = "gemini" } = body as { text?: string; provider?: AiProvider };

  if (!text?.trim()) return NextResponse.json({ error: "Chưa có nội dung để viết lại." }, { status: 400 });
  if (text.trim().length < 50) return NextResponse.json({ error: "Nội dung quá ngắn (tối thiểu 50 ký tự)." }, { status: 400 });

  const [settings, bannedWords] = await Promise.all([
    getSettingsRaw(),
    getActiveProfanityWords(),
  ]);
  const aiProvider = (provider as AiProvider) || "gemini";

  if (!aiReadyFor(settings, aiProvider)) {
    return NextResponse.json(
      { error: `Chưa cấu hình API key cho "${aiProvider}". Vào Cài đặt → AI & nội dung.` },
      { status: 400 },
    );
  }

  const bannedSection = bannedWords.length > 0
    ? `\nTỪ/CỤM BỊ CẤM — TUYỆT ĐỐI không dùng trong bài viết:\n${bannedWords.map((w) => `- ${w.text}`).join("\n")}\n`
    : "";

  const prompt = `Bạn là biên tập viên của "Quỳnh Phụ Tôi" — trang thông tin cộng đồng xã Quỳnh Phụ, Thái Bình.

NHIỆM VỤ: Diễn đạt lại nội dung gốc bằng ngôn ngữ khác để tránh đạo văn — TUYỆT ĐỐI không thêm, không bịa, không suy diễn bất kỳ thông tin nào không có trong bài gốc. Chỉ đổi từ ngữ, cấu trúc câu, cách trình bày. Giữ nguyên toàn bộ sự kiện, số liệu, tên người, tên địa danh, thời gian, mức giá, chính sách.
${bannedSection}

YÊU CẦU BẮT BUỘC về độ dài (đếm ký tự/từ trước khi trả về):
- title: ĐỦ 50-70 ký tự — có từ khoá chính, phản ánh đúng nội dung bài
- excerpt: ĐỦ 120-155 ký tự — tóm tắt thực tế, hấp dẫn, có từ khoá
- bodyHtml: Diễn đạt lại TOÀN BỘ nội dung gốc, không bỏ sót ý nào — chia đoạn bằng <h2>/<h3>, KHÔNG thêm thông tin ngoài bài gốc dù thiếu từ
- tags: 3-5 tags tiếng Việt phù hợp chủ đề
- seoMetaTitle: ĐỦ 50-60 ký tự — có từ khoá chính
- seoMetaDescription: ĐỦ 140-155 ký tự — mô tả đúng nội dung, kêu gọi click
- seoKeywords: 5-7 từ khoá SEO (không quá 7)
- coverAlt: 10-80 ký tự — mô tả ảnh bìa phù hợp nội dung

Trả về ĐÚNG JSON (không bọc markdown, không giải thích):
{
  "title": "...",
  "excerpt": "...",
  "bodyHtml": "... (chỉ dùng <h2>,<h3>,<p>,<ul>,<ol>,<li>,<strong>,<em>,<blockquote>, KHÔNG dùng <h1>, KHÔNG bịa thêm nội dung)",
  "tags": "tag1, tag2, tag3",
  "coverAlt": "...",
  "seoMetaTitle": "...",
  "seoMetaDescription": "...",
  "seoKeywords": "kw1, kw2, kw3, kw4, kw5"
}

Nội dung gốc:
${text.trim().slice(0, 8000)}

Bắt đầu JSON ngay từ dấu {`;

  try {
    let raw = await callAi(prompt, settings, aiProvider);
    raw = raw.replace(/^```json?\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd   = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      return NextResponse.json({ error: "AI trả về kết quả không hợp lệ. Thử lại." }, { status: 502 });
    }
    const result = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    void logActivity({
      userId: g.user._id!.toString(), userName: g.user.name, userEmail: g.user.email,
      userRole: g.user.role ?? "admin", category: "admin", action: "ai.rewrite",
      target: { type: "tin-tuc", label: result.title || "bài viết lại" }, success: true,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
