"use client";

// Form quên mật khẩu — gọi API /api/auth/forgot, gửi email chứa link đặt lại.
import { useRef, useState } from "react";
import Link from "next/link";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const captcha = useRef<RecaptchaHandle>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }

    setLoading(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, recaptchaToken }),
    });
    captcha.current?.reset();

    toast.success("Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.");
    setLoading(false);
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit} noValidate>
      <div className="form-title">Quên mật khẩu?</div>
      <div className="form-sub">Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu</div>

      <div className="field-group">
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <div className="input-wrap">
          <input
            type="email"
            id="email"
            placeholder="ten@quynhphu.vn"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <path d="M2 7l10 7 10-7" />
          </svg>
        </div>
      </div>

      <Recaptcha ref={captcha} className="qp-recaptcha" />

      <button className="btn-login" type="submit" disabled={loading}>
        {loading ? "Đang gửi…" : "Gửi liên kết đặt lại"}
      </button>

      <div className="divider">
        <hr />
        <span>hoặc</span>
        <hr />
      </div>

      <div className="signup-row">
        Nhớ mật khẩu rồi? <Link href="/dang-nhap">Đăng nhập</Link>
      </div>
    </form>
  );
}
