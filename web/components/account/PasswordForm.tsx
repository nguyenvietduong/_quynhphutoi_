"use client";

// Form đổi mật khẩu — nhập mật khẩu hiện tại + mật khẩu mới (xác nhận lại).
import { useRef, useState } from "react";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

export function PasswordForm() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const captcha = useRef<RecaptchaHandle>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) { toast.error("Mật khẩu mới phải có ít nhất 6 ký tự."); return; }
    if (next !== confirm) { toast.error("Xác nhận mật khẩu không khớp."); return; }
    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next, recaptchaToken }),
      });
      const data = await res.json().catch(() => ({}));
      captcha.current?.reset();
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      toast.success("Đã đổi mật khẩu thành công.");
      setCurrent(""); setNext(""); setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="qp-acc-form" onSubmit={submit}>
      <div className="qp-form-group">
        <label className="qp-label" htmlFor="pw-current">Mật khẩu hiện tại <span className="req">*</span></label>
        <input id="pw-current" type="password" className="qp-input" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
      </div>
      <div className="qp-form-group">
        <label className="qp-label" htmlFor="pw-next">Mật khẩu mới <span className="req">*</span></label>
        <input id="pw-next" type="password" className="qp-input" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} autoComplete="new-password" placeholder="Ít nhất 6 ký tự" />
      </div>
      <div className="qp-form-group">
        <label className="qp-label" htmlFor="pw-confirm">Xác nhận mật khẩu mới <span className="req">*</span></label>
        <input id="pw-confirm" type="password" className="qp-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} autoComplete="new-password" />
      </div>
      <Recaptcha ref={captcha} className="qp-recaptcha" />
      <button type="submit" className="qp-btn-primary" disabled={busy || !current || !next || !confirm}>{busy ? "Đang đổi…" : "Đổi mật khẩu"}</button>
    </form>
  );
}
