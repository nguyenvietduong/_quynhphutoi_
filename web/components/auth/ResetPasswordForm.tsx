"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

function getStrength(pw: string): { level: "" | "weak" | "fair" | "good" | "strong"; label: string } {
  if (!pw) return { level: "", label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: "weak", label: "Yếu" };
  if (score === 2) return { level: "fair", label: "Trung bình" };
  if (score === 3) return { level: "good", label: "Tốt" };
  return { level: "strong", label: "Mạnh" };
}

export function ResetPasswordForm() {
  const { toast } = useToast();
  const captcha = useRef<RecaptchaHandle>(null);
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const pwId = useId();
  const confirmId = useId();

  const hasToken = !!token;
  const strength = getStrength(password);

  useEffect(() => {
    if (!hasToken) toast.error("Liên kết không hợp lệ. Hãy yêu cầu gửi lại từ trang quên mật khẩu.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) { toast.error("Mật khẩu tối thiểu 6 ký tự."); return; }
    if (password !== confirm) { toast.error("Mật khẩu nhập lại không khớp."); return; }

    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, recaptchaToken }),
    });
    const data = await res.json().catch(() => ({}));
    captcha.current?.reset();

    if (!res.ok) {
      toast.error(data.error || "Đặt lại mật khẩu thất bại.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setDone(true);
  }

  const eyeHide = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
  const eyeShow = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  if (done) {
    return (
      <div className="form-panel">
        <div className="success-panel">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="success-title">Đặt lại thành công!</div>
          <p className="success-body">Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập với mật khẩu mới.</p>
          <Link href="/dang-nhap" className="btn-login" style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}>
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit} noValidate>
      <div className="title-row">
        <div className="title-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div className="form-title">Đặt lại mật khẩu</div>
      </div>
      <div className="form-sub">Nhập mật khẩu mới cho tài khoản của bạn</div>

      <div className="field-group">
        <label className="field-label" htmlFor={pwId}>Mật khẩu mới</label>
        <div className="input-wrap input-wrap--has-eye">
          <input
            type={showPw ? "text" : "password"}
            id={pwId}
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
          <button type="button" className="ico-eye" aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPw((v) => !v)}>
            {showPw ? eyeHide : eyeShow}
          </button>
        </div>
        {strength.level && (
          <>
            <div className={`strength-bar ${strength.level}`}>
              <span /><span /><span /><span />
            </div>
            <div className="strength-label">{strength.label}</div>
          </>
        )}
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor={confirmId}>Nhập lại mật khẩu mới</label>
        <div className="input-wrap input-wrap--has-eye">
          <input
            type={showConfirm ? "text" : "password"}
            id={confirmId}
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
          <button type="button" className="ico-eye" aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowConfirm((v) => !v)}>
            {showConfirm ? eyeHide : eyeShow}
          </button>
        </div>
      </div>

      <Recaptcha ref={captcha} className="qp-recaptcha" />

      <button className="btn-login" type="submit" disabled={loading || !hasToken}>
        {loading ? "Đang đổi…" : "Đổi mật khẩu"}
      </button>

      <div className="divider">
        <hr /><span>hoặc</span><hr />
      </div>

      <div className="signup-row">
        <Link href="/dang-nhap">Quay lại đăng nhập</Link>
      </div>
    </form>
  );
}
