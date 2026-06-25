import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettingsRaw } from "@/lib/settings";
import { callAi, aiReadyFor, configuredProviders, type AiProvider } from "@/lib/ai-call";

export async function POST(req: Request) {
  const g = await requireAdmin();
  if (g instanceof NextResponse) return g;

  const body = await req.json().catch(() => ({}));
  const { name, levelOptions, typeOptions, wards, provider } = body as {
    name?: string;
    levelOptions?: { slug: string; name: string }[];
    typeOptions?: { slug: string; name: string }[];
    wards?: { slug: string; name: string }[];
    provider?: AiProvider;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Chưa nhập tên trường." }, { status: 400 });

  const settings = await getSettingsRaw();
  const available = configuredProviders(settings);
  const aiProvider: AiProvider = provider && available.includes(provider) ? provider : (available[0] ?? "gemini");

  if (!aiReadyFor(settings, aiProvider)) {
    return NextResponse.json({ error: "Chưa cấu hình API key AI. Vào Cài đặt → AI & nội dung." }, { status: 400 });
  }

  const levelsStr  = (levelOptions ?? []).map((l) => `- ${l.slug}: ${l.name}`).join("\n");
  const typesStr   = (typeOptions  ?? []).map((t) => `- ${t.slug}: ${t.name}`).join("\n");
  const wardsStr   = (wards        ?? []).map((w) => `- ${w.slug}: ${w.name}`).join("\n");

  const prompt = `Bạn là chuyên gia giáo dục tại huyện Quỳnh Phụ, tỉnh Thái Bình (Việt Nam).

Từ TÊN TRƯỜNG bên dưới, hãy điền đầy đủ thông tin vào form quản lý trường học. Chỉ điền những gì chắc chắn — để chuỗi rỗng nếu không biết.

TÊN TRƯỜNG: "${name.trim()}"

DANH SÁCH CẤP HỌC — trả về đúng slug:
${levelsStr}

DANH SÁCH LOẠI HÌNH — trả về đúng slug (mặc định "cong-lap" nếu không rõ):
${typesStr}

DANH SÁCH XÃ / THỊ TRẤN — trả về slug nếu địa danh xuất hiện trong tên trường:
${wardsStr}

QUY TẮC điền địa chỉ & liên hệ:
- wardSlug: PHẢI là một trong các slug ở danh sách xã bên trên, khớp chính xác với địa danh trong tên trường. VD tên có "Quỳnh Hồng" → wardSlug = "quynh-hong". Nếu không xác định được → "".
- address: nếu xác định được xã, tối thiểu trả về "Xã [tên xã], huyện Quỳnh Phụ, tỉnh Thái Bình". Nếu biết thôn/xóm/đường thì thêm vào.
- email: trường tiểu học thường có dạng c1[tentruong]@edu.thaibinh.gov.vn, THCS → c2..., THPT → c3... Thử suy luận nếu hợp lý, không biết để "".
- website: nếu biết chính xác URL, điền vào. Nếu không chắc → "".
- phone, principal, foundedYear: chỉ điền nếu thực sự biết, không đoán mò.

Trả về ĐÚNG JSON (không bọc markdown, không giải thích thêm):
{
  "shortName": "tên viết tắt — bỏ từ 'Trường' đầu, giữ cấp học và địa danh. VD: 'THPT Quỳnh Côi'",
  "levelSlug": "slug cấp học chính",
  "levelSlugs": ["mảng slug cấp học"],
  "typeSlug": "slug loại hình",
  "wardSlug": "slug xã khớp chính xác danh sách, hoặc chuỗi rỗng",
  "address": "địa chỉ tối thiểu theo quy tắc trên",
  "phone": "số điện thoại nếu biết chắc, hoặc chuỗi rỗng",
  "email": "email theo quy tắc trên, hoặc chuỗi rỗng",
  "website": "URL nếu biết chắc, hoặc chuỗi rỗng",
  "principal": "tên hiệu trưởng nếu biết chắc, hoặc chuỗi rỗng",
  "foundedYear": "năm thành lập (số nguyên) nếu biết chắc, hoặc chuỗi rỗng",
  "description": "Đoạn giới thiệu 3-4 câu: cấp học, địa điểm, lịch sử thành lập, vai trò trong cộng đồng.",
  "seoMetaTitle": "tiêu đề SEO 50-60 ký tự có tên trường và địa điểm",
  "seoMetaDescription": "mô tả SEO 120-155 ký tự giới thiệu trường, thu hút click",
  "seoKeywords": "5-7 từ khoá phân cách bằng dấu phẩy"
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
