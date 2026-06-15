"use client";

// Form đăng ký — gọi API /api/auth/register (MongoDB), gửi email xác nhận.
import { useRef, useState } from "react";
import Link from "next/link";
import { CharCount } from "@/components/common/CharCount";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

export function RegisterForm() {
  const { toast } = useToast();
  const captcha = useRef<RecaptchaHandle>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      toast.error("Mật khẩu nhập lại không khớp.");
      return;
    }
    if (!agree) {
      toast.error("Vui lòng đồng ý với điều khoản sử dụng.");
      return;
    }

    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, recaptchaToken }),
    });
    const data = await res.json().catch(() => ({}));
    captcha.current?.reset();

    if (!res.ok) {
      toast.error(data.error || "Đăng ký thất bại.");
      setLoading(false);
      return;
    }

    toast.success("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.");
    setLoading(false);
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit} noValidate>
      <div className="form-title">Tạo tài khoản</div>
      <div className="form-sub">Tham gia cộng đồng Quỳnh Phụ Tôi</div>

      <div className="field-group">
        <label className="field-label" htmlFor="name">
          Họ và tên
          <CharCount value={name} max={80} />
        </label>
        <div className="input-wrap">
          <input
            type="text"
            id="name"
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        </div>
      </div>

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

      <div className="field-group">
        <label className="field-label" htmlFor="password">
          Mật khẩu
        </label>
        <div className="input-wrap">
          <input
            type="password"
            id="password"
            placeholder="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="confirm">
          Nhập lại mật khẩu
        </label>
        <div className="input-wrap">
          <input
            type="password"
            id="confirm"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      <div className="row-extra">
        <label className="remember">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> Tôi đồng ý với điều khoản sử dụng
        </label>
      </div>

      <Recaptcha ref={captcha} className="qp-recaptcha" />

      <button className="btn-login" type="submit" disabled={loading}>
        {loading ? "Đang tạo tài khoản…" : "Đăng ký"}
      </button>

      <div className="divider">
        <hr />
        <span>hoặc</span>
        <hr />
      </div>

      <div className="signup-row">
        Đã có tài khoản? <Link href="/dang-nhap">Đăng nhập</Link>
      </div>
    </form>
  );
}
