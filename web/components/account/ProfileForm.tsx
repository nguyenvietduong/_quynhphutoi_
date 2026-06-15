"use client";

// Form đổi thông tin tài khoản (tên hiển thị). Email chỉ đọc.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CharCount } from "@/components/common/CharCount";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const captcha = useRef<RecaptchaHandle>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, recaptchaToken }),
      });
      const data = await res.json().catch(() => ({}));
      captcha.current?.reset();
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      toast.success("Đã lưu thông tin.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const changed = name.trim() !== initialName.trim() && name.trim().length >= 2;

  return (
    <form className="qp-acc-form" onSubmit={submit}>
      <div className="qp-form-group">
        <label className="qp-label" htmlFor="acc-name">Tên hiển thị <span className="req">*</span><CharCount value={name} max={60} /></label>
        <input id="acc-name" className="qp-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="Họ và tên của bạn" />
      </div>
      <div className="qp-form-group">
        <label className="qp-label" htmlFor="acc-email">Email</label>
        <input id="acc-email" className="qp-input" value={email} disabled readOnly />
        <span className="qp-acc-form__hint">Email dùng để đăng nhập, không thể thay đổi.</span>
      </div>
      <Recaptcha ref={captcha} className="qp-recaptcha" />
      <button type="submit" className="qp-btn-primary" disabled={busy || !changed}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
    </form>
  );
}
