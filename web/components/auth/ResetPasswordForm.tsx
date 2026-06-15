"use client";

// Đặt lại mật khẩu — token lấy từ URL (?token=...), gọi API /api/auth/reset.
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

export function ResetPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const captcha = useRef<RecaptchaHandle>(null);
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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

    toast.success("Đổi mật khẩu thành công! Đang chuyển tới trang đăng nhập…");
    setTimeout(() => router.push("/dang-nhap"), 1600);
  }

  const hasToken = !!token;

  useEffect(() => {
    if (!hasToken) toast.error("Liên kết không hợp lệ. Hãy yêu cầu gửi lại từ trang quên mật khẩu.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  return (
    <form className="form-panel" onSubmit={handleSubmit} noValidate>
      <div className="form-title">Đặt lại mật khẩu</div>
      <div className="form-sub">Nhập mật khẩu mới cho tài khoản của bạn</div>

      <div className="field-group">
        <label className="field-label" htmlFor="password">
          Mật khẩu mới
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
          Nhập lại mật khẩu mới
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

      <Recaptcha ref={captcha} className="qp-recaptcha" />

      <button className="btn-login" type="submit" disabled={loading || !hasToken}>
        {loading ? "Đang đổi…" : "Đổi mật khẩu"}
      </button>

      <div className="divider">
        <hr />
        <span>hoặc</span>
        <hr />
      </div>

      <div className="signup-row">
        <Link href="/dang-nhap">Quay lại đăng nhập</Link>
      </div>
    </form>
  );
}
