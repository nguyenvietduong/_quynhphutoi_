import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettingsRaw } from "@/lib/settings";
import { callAi, aiReadyFor, configuredProviders, type AiProvider } from "@/lib/ai-call";

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const body = await req.json().catch(() => ({}));
  const { name, categoryOptions, wards, provider } = body as {
    name?: string;
    categoryOptions?: { slug: string; name: string }[];
    wards?: { slug: string; name: string }[];
    provider?: AiProvider;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Chưa nhập tên chợ / điểm mua bán." }, { status: 400 });

  const settings = await getSettingsRaw();
  const available = configuredProviders(settings);
  const aiProvider: AiProvider = provider && available.includes(provider) ? provider : (available[0] ?? "gemini");

  if (!aiReadyFor(settings, aiProvider)) {
    return NextResponse.json({ error: "Chưa cấu hình API key AI. Vào Cài đặt → AI & nội dung." }, { status: 400 });
  }

  const categoriesStr = (categoryOptions ?? []).map((c) => `- ${c.slug}: ${c.name}`).join("\n");
  const wardsStr      = (wards           ?? []).map((w) => `- ${w.slug}: ${w.name}`).join("\n");

  const prompt = `Bạn là chuyên gia về thương mại và chợ tại huyện Quỳnh Phụ, tỉnh Thái Bình (Việt Nam).

Từ TÊN CHỢ / ĐIỂM MUA BÁN bên dưới, hãy điền đầy đủ thông tin vào form quản lý. Chỉ điền những gì chắc chắn — để chuỗi rỗng nếu không biết.

TÊN CHỢ / ĐIỂM MUA BÁN: "${name.trim()}"

DANH SÁCH DANH MỤC — trả về đúng slug:
${categoriesStr}

DANH SÁCH XÃ / THỊ TRẤN — trả về slug nếu địa danh xuất hiện trong tên:
${wardsStr}

QUY TẮC điền thông tin:
- categorySlug: khớp loại chợ/điểm bán trong tên (chợ truyền thống, siêu thị, cửa hàng...).
- wardSlug: PHẢI là một trong các slug ở danh sách xã, khớp chính xác địa danh trong tên. Nếu không xác định → "".
- address: nếu xác định được xã, tối thiểu trả về "Xã [tên xã], huyện Quỳnh Phụ, tỉnh Thái Bình".
- schedule: lịch họp chợ VD "Hằng ngày 5:00-12:00" hoặc "Phiên 2,5,8 hàng tháng".
- priceText: mô tả giá cả VD "Bình dân, giá theo thị trường".

Trả về ĐÚNG JSON (không bọc markdown, không giải thích thêm):
{
  "categorySlug": "slug danh mục",
  "wardSlug": "slug xã khớp chính xác danh sách, hoặc chuỗi rỗng",
  "address": "địa chỉ tối thiểu theo quy tắc trên",
  "description": "Đoạn giới thiệu 3-4 câu về chợ / điểm mua bán, vị trí, mặt hàng chính.",
  "schedule": "lịch hoạt động, hoặc chuỗi rỗng",
  "priceText": "thông tin giá cả, hoặc chuỗi rỗng",
  "unit": "đơn vị quản lý, hoặc chuỗi rỗng",
  "contactName": "tên ban quản lý hoặc chủ, hoặc chuỗi rỗng",
  "contactPhone": "số điện thoại liên hệ, hoặc chuỗi rỗng",
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
