"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

export function ForgotPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const captcha = useRef<RecaptchaHandle>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, recaptchaToken }),
    });
    const data = await res.json().catch(() => ({}));
    captcha.current?.reset();
    setLoading(false);
    if (res.status === 429) {
      router.push(`/bi-chan?seconds=${data.retryAfter ?? 60}&from=quen-mat-khau`);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="form-panel">
        <div className="success-panel">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="success-title">Kiểm tra hộp thư</div>
          <p className="success-body">
            Nếu địa chỉ <strong>{email}</strong> tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra cả thư mục spam.
          </p>
          <Link href="/dang-nhap" className="success-link">← Quay lại đăng nhập</Link>
          <button
            type="button"
            className="btn-login"
            onClick={() => { setSubmitted(false); setEmail(""); }}
            style={{ fontSize: ".82rem" }}
          >
            Gửi lại liên kết
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit} noValidate>
      <div className="title-row">
        <div className="title-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="form-title">Quên mật khẩu?</div>
      </div>
      <div className="form-sub">Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu</div>

      <div className="field-group">
        <label className="field-label" htmlFor="forgot-email">Email</label>
        <div className="input-wrap">
          <input
            type="email"
            id="forgot-email"
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

      <button className="btn-login" type="submit" disabled={loading} style={{ marginTop: 14 }}>
        {loading ? "Đang gửi…" : "Gửi liên kết đặt lại"}
      </button>

      <div className="divider">
        <hr /><span>hoặc</span><hr />
      </div>

      <div className="signup-row">
        Nhớ mật khẩu rồi? <Link href="/dang-nhap">Đăng nhập</Link>
      </div>
    </form>
  );
}
