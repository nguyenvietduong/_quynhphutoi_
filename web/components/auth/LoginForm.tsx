"use client";

// Form đăng nhập — gọi API /api/auth/login (MongoDB + JWT cookie).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const captcha = useRef<RecaptchaHandle>(null);
  const verify = useSearchParams().get("verify"); // sau khi bấm link xác nhận email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (verify === "success") toast.success("Xác nhận email thành công! Bạn có thể đăng nhập.");
    else if (verify === "invalid") toast.error("Liên kết xác nhận không hợp lệ hoặc đã hết hạn.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verify]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, recaptchaToken }),
    });
    const data = await res.json().catch(() => ({}));
    captcha.current?.reset();

    if (!res.ok) {
      toast.error(data.error || "Đăng nhập thất bại.");
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/");
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit} noValidate>
      <div className="form-title">
        Chào mừng
        <br />
        trở lại 👋
      </div>
      <div className="form-sub">Đăng nhập để tiếp tục với Quỳnh Phụ Tôi</div>

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
            placeholder="••••••••"
            autoComplete="current-password"
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

      <div className="row-extra">
        <label className="remember">
          <input type="checkbox" /> Ghi nhớ đăng nhập
        </label>
        <Link href="/quen-mat-khau" className="forgot">
          Quên mật khẩu?
        </Link>
      </div>

      <Recaptcha ref={captcha} className="qp-recaptcha" />

      <button className="btn-login" type="submit" disabled={loading}>
        {loading ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>

      <div className="divider">
        <hr />
        <span>hoặc</span>
        <hr />
      </div>

      <div className="signup-row">
        Chưa có tài khoản? <Link href="/dang-ky">Đăng ký ngay</Link>
      </div>
    </form>
  );
}
