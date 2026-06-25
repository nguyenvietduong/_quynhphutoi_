import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettingsRaw } from "@/lib/settings";
import { callAi, aiReadyFor, configuredProviders, type AiProvider } from "@/lib/ai-call";

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const body = await req.json().catch(() => ({}));
  const { name, typeOptions, rankingOptions, wards, provider } = body as {
    name?: string;
    typeOptions?: { slug: string; name: string }[];
    rankingOptions?: { slug: string; name: string }[];
    wards?: { slug: string; name: string }[];
    provider?: AiProvider;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Chưa nhập tên di tích." }, { status: 400 });

  const settings = await getSettingsRaw();
  const available = configuredProviders(settings);
  const aiProvider: AiProvider = provider && available.includes(provider) ? provider : (available[0] ?? "gemini");

  if (!aiReadyFor(settings, aiProvider)) {
    return NextResponse.json({ error: "Chưa cấu hình API key AI. Vào Cài đặt → AI & nội dung." }, { status: 400 });
  }

  const typesStr   = (typeOptions   ?? []).map((t) => `- ${t.slug}: ${t.name}`).join("\n");
  const rankStr    = (rankingOptions ?? []).map((r) => `- ${r.slug}: ${r.name}`).join("\n");
  const wardsStr   = (wards         ?? []).map((w) => `- ${w.slug}: ${w.name}`).join("\n");

  const prompt = `Bạn là nhà nghiên cứu lịch sử và văn hoá tại huyện Quỳnh Phụ, tỉnh Thái Bình (Việt Nam).

Từ TÊN DI TÍCH bên dưới, hãy điền đầy đủ thông tin vào form quản lý di tích lịch sử - văn hoá. Chỉ điền những gì chắc chắn — để chuỗi rỗng nếu không biết.

TÊN DI TÍCH: "${name.trim()}"

DANH SÁCH LOẠI DI TÍCH — trả về đúng slug:
${typesStr}

DANH SÁCH XẾP HẠNG — trả về đúng slug nếu biết:
${rankStr}

DANH SÁCH XÃ / THỊ TRẤN — trả về slug nếu địa danh xuất hiện trong tên:
${wardsStr}

QUY TẮC điền thông tin:
- typeSlug: đình, chùa, đền, miếu, nhà thờ, từ đường, khu di tích...
- rankingSlug: xếp hạng quốc gia, cấp tỉnh... Chỉ điền nếu biết chắc.
- wardSlug: PHẢI là một trong các slug ở danh sách xã, khớp chính xác địa danh trong tên. Nếu không xác định → "".
- address: nếu xác định được xã, tối thiểu trả về "Xã [tên xã], huyện Quỳnh Phụ, tỉnh Thái Bình".
- era: niên đại xây dựng VD "Thời Lê (thế kỷ XV-XVIII)", "Thời Nguyễn", "1945"...
- worship: đối tượng thờ phụng VD "Thành hoàng làng", "Phật Thích Ca", "Anh hùng liệt sĩ"...
- festival: lễ hội chính VD "Hội làng ngày 10 tháng Giêng âm lịch".
- recognizedYear: năm được xếp hạng/công nhận (số nguyên), không biết để null.

Trả về ĐÚNG JSON (không bọc markdown, không giải thích thêm):
{
  "typeSlug": "slug loại di tích",
  "rankingSlug": "slug xếp hạng nếu biết, hoặc chuỗi rỗng",
  "wardSlug": "slug xã khớp chính xác danh sách, hoặc chuỗi rỗng",
  "address": "địa chỉ tối thiểu theo quy tắc trên",
  "era": "niên đại, hoặc chuỗi rỗng",
  "worship": "đối tượng thờ phụng / sự tích, hoặc chuỗi rỗng",
  "festival": "lễ hội chính, hoặc chuỗi rỗng",
  "recognizedYear": null,
  "description": "Đoạn giới thiệu 4-5 câu: lịch sử, kiến trúc, giá trị văn hoá, lễ hội.",
  "seoMetaTitle": "tiêu đề SEO 50-60 ký tự có tên di tích và địa điểm",
  "seoMetaDescription": "mô tả SEO 120-155 ký tự giới thiệu di tích",
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
