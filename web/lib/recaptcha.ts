// Xác minh Google reCAPTCHA v2 (ô tick "Tôi không phải robot") phía server.
// Chưa cấu hình RECAPTCHA_SECRET_KEY → bỏ qua (trả true) để dev/local vẫn chạy.

const SECRET = process.env.RECAPTCHA_SECRET_KEY || "";

export const recaptchaEnabled = !!SECRET;

export async function verifyRecaptcha(token: unknown): Promise<boolean> {
  if (!SECRET) return true; // chưa bật → cho qua
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: SECRET, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    if (process.env.NODE_ENV !== "production") {
      console.log("[reCAPTCHA v2]", { success: data.success });
    }
    return !!data.success;
  } catch {
    return false; // lỗi mạng tới Google → coi như không hợp lệ (fail-closed khi đã bật)
  }
}
