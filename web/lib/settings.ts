// Cấu hình hệ thống chỉnh được từ admin (lưu DB, 1 document _id="app").
// Mặc định lấy từ env; admin sửa sẽ ghi đè và có hiệu lực ngay (không cần restart).
import { getDb } from "@/lib/db";

export type AppSettings = {
  // --- Đăng tin (chống spam) ---
  postDailyMax: number;
  postCooldownMin: number;
  postCooldownMax: number;
  postMaxImages: number;
  adMaxImages: number;             // số ảnh tối đa cho 1 quảng cáo (thư viện trang chi tiết)
  postRequireApproval: boolean;
  jobsPostEnabled: boolean;        // cho phép đăng tin Việc làm
  lostfoundPostEnabled: boolean;   // cho phép đăng tin Tìm đồ rơi
  classifiedsPostEnabled: boolean; // cho phép đăng tin Mua bán
  newsPostEnabled: boolean;        // cho phép người dùng gửi bài Tin tức

  // --- Bình luận & tương tác ---
  commentsEnabled: boolean;
  commentMaxLength: number;
  commentMaxPerMin: number;
  likesEnabled: boolean;           // bật/tắt nút thích

  // --- Bảo mật ---
  registerEnabled: boolean;        // cho phép đăng ký tài khoản mới

  // --- Liên hệ & thông tin chung ---
  contactEmail: string;
  contactHotline: string;
  contactLocation: string;
  contactNote: string;
  socialFacebook: string;
  socialYoutube: string;
  socialZalo: string;

  // --- SEO toàn site (để trống = dùng giá trị mặc định trong lib/seo.ts) ---
  seoSiteName: string;            // tên site + hậu tố tiêu đề ("%s · <tên>")
  seoSiteDescription: string;     // mô tả mặc định cho trang chủ & khi trang không có mô tả riêng
  seoDefaultKeywords: string;     // từ khoá gốc, cách nhau dấu phẩy
  seoDefaultOgImage: string;      // ảnh OG mặc định (URL) — trống = ảnh OG động /opengraph-image
  seoVerificationGoogle: string;  // mã xác minh Google Search Console
  seoVerificationBing: string;    // mã xác minh Bing Webmaster
};

const DEFAULTS: AppSettings = {
  postDailyMax: Number(process.env.POST_DAILY_MAX || "5"),
  postCooldownMin: Number(process.env.POST_COOLDOWN_MIN || "10"),
  postCooldownMax: Number(process.env.POST_COOLDOWN_MAX || "60"),
  postMaxImages: 8,
  adMaxImages: 6,
  postRequireApproval: true,
  jobsPostEnabled: true,
  lostfoundPostEnabled: true,
  classifiedsPostEnabled: true,
  newsPostEnabled: true,

  commentsEnabled: true,
  commentMaxLength: 1000,
  commentMaxPerMin: 6,
  likesEnabled: true,

  registerEnabled: true,

  contactEmail: "duongnv10504@gmail.com",
  contactHotline: "",
  contactLocation: "Xã Quỳnh Phụ · Thái Bình",
  contactNote: "Nhận đặt quảng cáo & hợp tác",
  socialFacebook: "",
  socialYoutube: "",
  socialZalo: "",

  seoSiteName: "",
  seoSiteDescription: "",
  seoDefaultKeywords: "",
  seoDefaultOgImage: "",
  seoVerificationGoogle: "",
  seoVerificationBing: "",
};

type SettingsDoc = { _id: string; values: Partial<AppSettings> };

async function col() {
  const db = await getDb();
  return db.collection<SettingsDoc>("settings");
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const doc = await (await col()).findOne({ _id: "app" });
    return { ...DEFAULTS, ...(doc?.values ?? {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

const int = (n: unknown, min: number, max: number, dflt: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : dflt;
};
const str = (s: unknown, max: number, dflt: string) =>
  typeof s === "string" ? s.trim().slice(0, max) : dflt;
const bool = (b: unknown, dflt: boolean) => (typeof b === "boolean" ? b : dflt);

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const c = await getSettings();
  const next: AppSettings = {
    postDailyMax: int(patch.postDailyMax ?? c.postDailyMax, 1, 100, c.postDailyMax),
    postCooldownMin: int(patch.postCooldownMin ?? c.postCooldownMin, 0, 1440, c.postCooldownMin),
    postCooldownMax: int(patch.postCooldownMax ?? c.postCooldownMax, 0, 1440, c.postCooldownMax),
    postMaxImages: int(patch.postMaxImages ?? c.postMaxImages, 1, 20, c.postMaxImages),
    adMaxImages: int(patch.adMaxImages ?? c.adMaxImages, 1, 20, c.adMaxImages),
    postRequireApproval: bool(patch.postRequireApproval, c.postRequireApproval),
    jobsPostEnabled: bool(patch.jobsPostEnabled, c.jobsPostEnabled),
    lostfoundPostEnabled: bool(patch.lostfoundPostEnabled, c.lostfoundPostEnabled),
    classifiedsPostEnabled: bool(patch.classifiedsPostEnabled, c.classifiedsPostEnabled),
    newsPostEnabled: bool(patch.newsPostEnabled, c.newsPostEnabled),

    commentsEnabled: bool(patch.commentsEnabled, c.commentsEnabled),
    commentMaxLength: int(patch.commentMaxLength ?? c.commentMaxLength, 50, 5000, c.commentMaxLength),
    commentMaxPerMin: int(patch.commentMaxPerMin ?? c.commentMaxPerMin, 1, 60, c.commentMaxPerMin),
    likesEnabled: bool(patch.likesEnabled, c.likesEnabled),

    registerEnabled: bool(patch.registerEnabled, c.registerEnabled),

    contactEmail: str(patch.contactEmail ?? c.contactEmail, 120, c.contactEmail),
    contactHotline: str(patch.contactHotline ?? c.contactHotline, 40, c.contactHotline),
    contactLocation: str(patch.contactLocation ?? c.contactLocation, 120, c.contactLocation),
    contactNote: str(patch.contactNote ?? c.contactNote, 120, c.contactNote),
    socialFacebook: str(patch.socialFacebook ?? c.socialFacebook, 200, c.socialFacebook),
    socialYoutube: str(patch.socialYoutube ?? c.socialYoutube, 200, c.socialYoutube),
    socialZalo: str(patch.socialZalo ?? c.socialZalo, 200, c.socialZalo),

    seoSiteName: str(patch.seoSiteName ?? c.seoSiteName, 80, c.seoSiteName),
    seoSiteDescription: str(patch.seoSiteDescription ?? c.seoSiteDescription, 300, c.seoSiteDescription),
    seoDefaultKeywords: str(patch.seoDefaultKeywords ?? c.seoDefaultKeywords, 400, c.seoDefaultKeywords),
    seoDefaultOgImage: str(patch.seoDefaultOgImage ?? c.seoDefaultOgImage, 500, c.seoDefaultOgImage),
    seoVerificationGoogle: str(patch.seoVerificationGoogle ?? c.seoVerificationGoogle, 200, c.seoVerificationGoogle),
    seoVerificationBing: str(patch.seoVerificationBing ?? c.seoVerificationBing, 200, c.seoVerificationBing),
  };
  if (next.postCooldownMax < next.postCooldownMin) next.postCooldownMax = next.postCooldownMin;
  await (await col()).updateOne({ _id: "app" }, { $set: { values: next } }, { upsert: true });
  return next;
}
