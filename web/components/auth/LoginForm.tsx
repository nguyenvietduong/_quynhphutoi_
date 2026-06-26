"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/common/Toast";

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const verify = useSearchParams().get("verify");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const pwId = useId();

  useEffect(() => {
    if (verify === "success") toast.success("Xác nhận email thành công! Bạn có thể đăng nhập.");
    else if (verify === "invalid") toast.error("Liên kết xác nhận không hợp lệ hoặc đã hết hạn.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verify]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 429) {
      router.push(`/bi-chan?seconds=${data.retryAfter ?? 60}&from=dang-nhap`);
      return;
    }
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
        trở lại
      </div>
      <div className="form-sub">Đăng nhập để tiếp tục với Quỳnh Phụ Tôi</div>

      <div className="field-group">
        <label className="field-label" htmlFor="email">Email</label>
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
        <label className="field-label" htmlFor={pwId}>Mật khẩu</label>
        <div className="input-wrap input-wrap--has-eye">
          <input
            type={showPw ? "text" : "password"}
            id={pwId}
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
          <button type="button" className="ico-eye" aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPw((v) => !v)}>
            {showPw ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="row-extra">
        <label className="remember">
          <input type="checkbox" /> Ghi nhớ đăng nhập
        </label>
        <Link href="/quen-mat-khau" className="forgot">Quên mật khẩu?</Link>
      </div>

      <button className="btn-login" type="submit" disabled={loading}>
        {loading ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>

      <div className="divider">
        <hr /><span>hoặc tiếp tục với</span><hr />
      </div>

      <div className="social-row">
        <button type="button" className="btn-social" onClick={() => toast.success("Tính năng đăng nhập bằng Google sẽ sớm có.")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>
        <button type="button" className="btn-social" onClick={() => toast.success("Tính năng đăng nhập bằng GitHub sẽ sớm có.")}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>

      <div className="signup-row" style={{ marginTop: 14 }}>
        Chưa có tài khoản? <Link href="/dang-ky">Đăng ký ngay</Link>
      </div>
    </form>
  );
}
