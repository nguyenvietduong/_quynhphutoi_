// API Mua bán: liệt kê (GET) & đăng tin (POST — cần đăng nhập).
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { sanitizeHtml } from "@/lib/sanitize";
import { stripHtml } from "@/lib/strip-html";
import { adaptiveRecaptcha } from "@/lib/recaptcha";
import { checkPostQuota, recordPost } from "@/lib/post-quota";
import { getSettings } from "@/lib/settings";
import { scanProfanity, getActiveProfanityWords } from "@/lib/profanity";
import { isGoogleMapsUrl, resolveMapUrl } from "@/lib/map-embed";
import { createClassified, listClassifieds, countClassifieds, type ClassifiedStatus, type ClassifiedCondition } from "@/lib/classifieds";
import { listActiveCategoryOptions, categoryLabelMap } from "@/lib/categories";

const STATUSES: ClassifiedStatus[] = ["open", "sold", "closed"];

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const cat = sp.get("category");
  const status = sp.get("status");
  const opts = {
    category: cat || undefined,
    wardSlug: sp.get("ward") || undefined,
    status: status && STATUSES.includes(status as ClassifiedStatus) ? (status as ClassifiedStatus) : undefined,
    search: sp.get("search") || undefined,
    limit: Math.min(Number(sp.get("limit")) || 24, 100),
    skip: Math.min(Math.max(Number(sp.get("skip")) || 0, 0), 10000),
  };
  const [items, total] = await Promise.all([listClassifieds(opts), countClassifieds(opts)]);
  return NextResponse.json({ items, total });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Vui lòng đăng nhập để đăng tin." }, { status: 401 });

  const settings = await getSettings();
  if (!settings.classifiedsPostEnabled) return NextResponse.json({ error: "Tính năng đăng tin mua bán đang tạm khoá." }, { status: 403 });

  const quota = await checkPostQuota(session.id);
  if (!quota.ok) return NextResponse.json({ error: quota.message }, { status: 429 });

  const b = await req.json().catch(() => ({}));
  const cap = await adaptiveRecaptcha(req, "classified", b.recaptchaToken);
  if (cap) return cap;
  const { category, description, images, priceText, condition, location, contact } = b;
  const title = stripHtml(String(b.title ?? "")).trim();

  if (!title) return NextResponse.json({ error: "Vui lòng nhập tiêu đề." }, { status: 400 });
  if (title.length > 160) return NextResponse.json({ error: "Tiêu đề quá dài (tối đa 160 ký tự)." }, { status: 400 });
  const catSlugs = (await listActiveCategoryOptions("mua-ban")).map((c) => c.slug);
  if (typeof category !== "string" || !catSlugs.includes(category)) return NextResponse.json({ error: "Vui lòng chọn danh mục." }, { status: 400 });

  const cleanDescription = sanitizeHtml(typeof description === "string" ? description : "");
  if (!stripHtml(cleanDescription)) return NextResponse.json({ error: "Vui lòng nhập mô tả." }, { status: 400 });
  if (!location?.wardSlug) return NextResponse.json({ error: "Vui lòng chọn địa điểm." }, { status: 400 });
  if (!contact?.name?.trim() || !contact?.phone?.trim()) return NextResponse.json({ error: "Vui lòng nhập tên và SĐT liên hệ." }, { status: 400 });
  const phoneClean = String(contact.phone).replace(/[\s.\-()]/g, "");
  if (!/^(?:0\d{9}|\+84\d{9})$/.test(phoneClean)) return NextResponse.json({ error: "Số điện thoại không hợp lệ." }, { status: 400 });

  const over = (v: unknown, n: number) => typeof v === "string" && v.length > n;
  if (over(contact.name, 80) || over(contact.email, 120) || over(location.address, 200) || over(priceText, 60)) {
    return NextResponse.json({ error: "Một số trường nhập quá dài, vui lòng rút gọn." }, { status: 400 });
  }

  // Tình trạng: tuỳ chọn — nhận slug hợp lệ trong danh mục "tinh-trang" (DB quản lý).
  const condSlugs = condition ? await categoryLabelMap("tinh-trang") : {};
  const cond: ClassifiedCondition | undefined =
    typeof condition === "string" && condition in condSlugs ? condition : undefined;

  // Link Google Maps (tuỳ chọn): validate + resolve link rút gọn → lưu link đầy đủ có toạ độ.
  let mapUrl: string | undefined;
  const rawMap = typeof location.mapUrl === "string" ? location.mapUrl.trim() : "";
  if (rawMap) {
    if (rawMap.length > 500 || !isGoogleMapsUrl(rawMap)) {
      return NextResponse.json({ error: "Link Google Maps không hợp lệ." }, { status: 400 });
    }
    mapUrl = await resolveMapUrl(rawMap);
  }

  // Lọc từ ngữ thô tục: nếu phát hiện → KHÔNG tự động duyệt, giữ chờ admin xem.
  const badWords = settings.profanityFilterEnabled
    ? scanProfanity(`${title}\n${stripHtml(cleanDescription)}\n${priceText ?? ""}`, await getActiveProfanityWords())
    : [];
  const approved = !settings.postRequireApproval && badWords.length === 0;

  try {
    const ad = await createClassified(
      { id: session.id, name: session.name },
      {
        title, category,
        description: cleanDescription,
        approved,
        images: Array.isArray(images) ? images.filter((x) => typeof x === "string").slice(0, settings.postMaxImages) : [],
        priceText: typeof priceText === "string" && priceText.trim() ? priceText.trim() : "Thỏa thuận",
        condition: cond,
        location: { wardSlug: location.wardSlug, address: location.address?.trim() || undefined, mapUrl },
        contact: { name: contact.name.trim(), phone: phoneClean, email: contact.email?.trim() || undefined, hidePhone: !!contact.hidePhone },
      },
    );
    await recordPost(session.id);
    await notifyAdmins(
      {
        type: "post_pending",
        title: badWords.length
          ? `⚠️ Tin mua bán có từ ngữ nhạy cảm, cần xem: “${ad.title}”`
          : `Tin mua bán mới chờ duyệt: “${ad.title}”`,
        href: "/admin/mua-ban", actorName: session.name, module: "mua-ban",
      },
      session.id,
    );
    return NextResponse.json({ ok: true, slug: ad.slug, approved });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Đăng tin thất bại." }, { status: 400 });
  }
}
