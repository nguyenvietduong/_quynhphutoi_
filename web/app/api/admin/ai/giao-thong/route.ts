import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettingsRaw } from "@/lib/settings";
import { callAi, aiReadyFor, configuredProviders, type AiProvider } from "@/lib/ai-call";

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const body = await req.json().catch(() => ({}));
  const { name, typeOptions, provider } = body as {
    name?: string;
    typeOptions?: { slug: string; name: string }[];
    provider?: AiProvider;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Chưa nhập tên tuyến giao thông." }, { status: 400 });

  const settings = await getSettingsRaw();
  const available = configuredProviders(settings);
  const aiProvider: AiProvider = provider && available.includes(provider) ? provider : (available[0] ?? "gemini");

  if (!aiReadyFor(settings, aiProvider)) {
    return NextResponse.json({ error: "Chưa cấu hình API key AI. Vào Cài đặt → AI & nội dung." }, { status: 400 });
  }

  const typesStr = (typeOptions ?? []).map((t) => `- ${t.slug}: ${t.name}`).join("\n");

  const prompt = `Bạn là chuyên gia giao thông vận tải tại huyện Quỳnh Phụ, tỉnh Thái Bình (Việt Nam).

Từ TÊN TUYẾN / PHƯƠNG TIỆN GIAO THÔNG bên dưới, hãy điền đầy đủ thông tin vào form quản lý. Chỉ điền những gì chắc chắn — để chuỗi rỗng nếu không biết.

TÊN TUYẾN GIAO THÔNG: "${name.trim()}"

DANH SÁCH LOẠI HÌNH — trả về đúng slug:
${typesStr}

QUY TẮC điền thông tin:
- typeSlug: khớp loại phương tiện (xe buýt, taxi, xe khách, đò/phà, xe ôm công nghệ...).
- origin, destination: điểm đầu và điểm cuối tuyến nếu xác định được.
- stops: các điểm dừng trên tuyến, mỗi điểm một dòng (newline-separated), hoặc mảng rỗng.
- fare: giá vé hoặc giá cước VD "15.000đ/lượt".
- frequency: tần suất VD "15 phút/chuyến", "6h-22h hằng ngày".
- duration: thời gian di chuyển VD "45 phút".
- distance: khoảng cách VD "12 km".

Trả về ĐÚNG JSON (không bọc markdown, không giải thích thêm):
{
  "typeSlug": "slug loại hình",
  "origin": "điểm đầu tuyến, hoặc chuỗi rỗng",
  "destination": "điểm cuối tuyến, hoặc chuỗi rỗng",
  "stops": ["điểm dừng 1", "điểm dừng 2"],
  "operator": "đơn vị vận hành nếu biết, hoặc chuỗi rỗng",
  "phone": "số điện thoại liên hệ nếu biết, hoặc chuỗi rỗng",
  "fare": "giá vé, hoặc chuỗi rỗng",
  "frequency": "tần suất, hoặc chuỗi rỗng",
  "duration": "thời gian di chuyển, hoặc chuỗi rỗng",
  "distance": "khoảng cách, hoặc chuỗi rỗng",
  "note": "ghi chú thêm, hoặc chuỗi rỗng",
  "description": "Đoạn mô tả 2-3 câu về tuyến giao thông, lộ trình, tiện ích.",
  "seoMetaTitle": "tiêu đề SEO 50-60 ký tự",
  "seoMetaDescription": "mô tả SEO 120-155 ký tự",
  "seoKeywords": "5-7 từ khoá phân cách dấu phẩy"
}

Bắt đầu JSON ngay từ dấu {`;

  try {
    let raw = await callAi(prompt, settings, aiProvider);
    raw = raw.replace(/^```json?\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s === -1 || e <= s) return NextResponse.json({ error: "AI trả về kết quả không hợp lệ. Thử lại." }, { status: 502 });
    const result = JSON.parse(raw.slice(s, e + 1));
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
