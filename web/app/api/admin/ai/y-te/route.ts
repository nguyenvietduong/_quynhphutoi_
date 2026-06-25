import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettingsRaw } from "@/lib/settings";
import { callAi, aiReadyFor, configuredProviders, type AiProvider } from "@/lib/ai-call";

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const body = await req.json().catch(() => ({}));
  const { name, typeOptions, ownershipOptions, wards, provider } = body as {
    name?: string;
    typeOptions?: { slug: string; name: string }[];
    ownershipOptions?: { slug: string; name: string }[];
    wards?: { slug: string; name: string }[];
    provider?: AiProvider;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Chưa nhập tên cơ sở y tế." }, { status: 400 });

  const settings = await getSettingsRaw();
  const available = configuredProviders(settings);
  const aiProvider: AiProvider = provider && available.includes(provider) ? provider : (available[0] ?? "gemini");

  if (!aiReadyFor(settings, aiProvider)) {
    return NextResponse.json({ error: "Chưa cấu hình API key AI. Vào Cài đặt → AI & nội dung." }, { status: 400 });
  }

  const typesStr      = (typeOptions      ?? []).map((t) => `- ${t.slug}: ${t.name}`).join("\n");
  const ownershipStr  = (ownershipOptions ?? []).map((o) => `- ${o.slug}: ${o.name}`).join("\n");
  const wardsStr      = (wards            ?? []).map((w) => `- ${w.slug}: ${w.name}`).join("\n");

  const prompt = `Bạn là chuyên gia y tế tại huyện Quỳnh Phụ, tỉnh Thái Bình (Việt Nam).

Từ TÊN CƠ SỞ Y TẾ bên dưới, hãy điền đầy đủ thông tin vào form quản lý. Chỉ điền những gì chắc chắn — để chuỗi rỗng nếu không biết.

TÊN CƠ SỞ Y TẾ: "${name.trim()}"

DANH SÁCH LOẠI HÌNH — trả về đúng slug:
${typesStr}

DANH SÁCH LOẠI HÌNH SỞ HỮU — trả về đúng slug:
${ownershipStr}

DANH SÁCH XÃ / THỊ TRẤN — trả về slug nếu địa danh xuất hiện trong tên:
${wardsStr}

QUY TẮC điền thông tin:
- typeSlug: khớp với loại cơ sở trong tên (bệnh viện, trạm y tế, phòng khám, nhà thuốc...).
- ownershipSlug: thường là "cong-lap" cho bệnh viện nhà nước, trạm y tế xã; "tu-nhan" cho phòng khám tư.
- wardSlug: PHẢI là một trong các slug ở danh sách xã, khớp với địa danh trong tên. Nếu không xác định → "".
- address: nếu xác định được xã, tối thiểu trả về "Xã [tên xã], huyện Quỳnh Phụ, tỉnh Thái Bình".
- emergency: true nếu là bệnh viện hoặc cấp cứu, false còn lại.
- beds: số giường bệnh nếu biết chắc (số nguyên), không biết để null.

Trả về ĐÚNG JSON (không bọc markdown, không giải thích thêm):
{
  "shortName": "tên viết tắt ngắn gọn",
  "typeSlug": "slug loại hình",
  "ownershipSlug": "slug sở hữu",
  "wardSlug": "slug xã khớp chính xác danh sách, hoặc chuỗi rỗng",
  "address": "địa chỉ tối thiểu theo quy tắc trên",
  "phone": "số điện thoại nếu biết chắc, hoặc chuỗi rỗng",
  "email": "email nếu biết chắc, hoặc chuỗi rỗng",
  "website": "URL nếu biết chắc, hoặc chuỗi rỗng",
  "director": "tên giám đốc / trưởng trạm nếu biết chắc, hoặc chuỗi rỗng",
  "hours": "giờ hoạt động VD '7:00-17:00', hoặc chuỗi rỗng",
  "emergency": false,
  "beds": null,
  "specialties": "chuyên khoa chính, phân cách dấu phẩy, hoặc chuỗi rỗng",
  "foundedYear": null,
  "description": "Đoạn giới thiệu 3-4 câu về cơ sở y tế, vị trí, dịch vụ chính.",
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
