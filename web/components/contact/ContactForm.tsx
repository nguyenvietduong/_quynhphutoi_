"use client";

import { useRef, useState } from "react";
import { CharCount } from "@/components/common/CharCount";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

const TYPES = ["Đặt quảng cáo", "Hợp tác / tài trợ", "Góp ý nội dung", "Báo lỗi / phản ánh", "Khác"];

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const captcha = useRef<RecaptchaHandle>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("Đặt quảng cáo");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, type, message, recaptchaToken }),
      });
      const data = await res.json().catch(() => ({}));
      captcha.current?.reset();
      if (!res.ok) { toast.error(data.error || "Gửi liên hệ thất bại, vui lòng thử lại."); return; }
      setName(""); setEmail(""); setPhone(""); setType("Đặt quảng cáo"); setMessage("");
      toast.success("Đã gửi liên hệ! Mình sẽ phản hồi qua email sớm nhất.");
    } catch {
      toast.error("Không kết nối được máy chủ. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }

  return (
    <form className="qp-panel" onSubmit={onSubmit}>
      <h2 className="type-h3 qp-panel__title">Gửi liên hệ</h2>
      <p className="type-body-small qp-panel__sub">
        Điền thông tin bên dưới, mình sẽ phản hồi qua email sớm nhất. Để đặt quảng cáo, chọn loại
        “Đặt quảng cáo” và mô tả nhu cầu.
      </p>

      <div className="qp-form-group">
        <label className="qp-label" htmlFor="ct-name">Họ tên / Tên đơn vị <span className="req">*</span><CharCount value={name} max={120} /></label>
        <input id="ct-name" className="qp-input" name="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A / Công ty ABC" />
      </div>

      <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
        <div className="qp-form-group">
          <label className="qp-label" htmlFor="ct-email">Email <span className="req">*</span><CharCount value={email} max={120} /></label>
          <input id="ct-email" type="email" className="qp-input" name="email" required maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@cua-ban.com" />
        </div>
        <div className="qp-form-group">
          <label className="qp-label" htmlFor="ct-phone">Số điện thoại<CharCount value={phone} max={20} /></label>
          <input id="ct-phone" type="tel" className="qp-input" name="phone" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" />
        </div>
      </div>

      <div className="qp-form-group">
        <label className="qp-label" htmlFor="ct-type">Loại liên hệ</label>
        <select id="ct-type" className="qp-select" name="type" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="qp-form-group">
        <label className="qp-label" htmlFor="ct-msg">Nội dung <span className="req">*</span><CharCount value={message} max={2000} /></label>
        <textarea id="ct-msg" className="qp-textarea" name="message" required maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mô tả nhu cầu của bạn (vị trí quảng cáo, thời gian, ngân sách…)" />
      </div>

      <label className="qp-check">
        <input type="checkbox" name="agree" required />
        Tôi đồng ý để được liên hệ lại qua email hoặc điện thoại.
      </label>

      <Recaptcha ref={captcha} className="qp-recaptcha" />

      <button className="qp-btn-primary qp-btn-block mt-6" type="submit" disabled={busy}>
        {busy ? "Đang gửi…" : <>Gửi liên hệ <span className="qp-arrow">→</span></>}
      </button>
    </form>
  );
}
