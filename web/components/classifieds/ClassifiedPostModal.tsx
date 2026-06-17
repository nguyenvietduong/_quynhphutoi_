"use client";

// Modal đăng tin Mua bán — POST /api/mua-ban (cần đăng nhập). Tin chờ admin duyệt.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WARDS } from "@/lib/wards";
import type { ClassifiedCategory } from "@/lib/classified-categories";
import { Combobox } from "@/components/lostfound/Combobox";
import { RichTextEditor } from "@/components/lostfound/RichTextEditor";
import { ImageUploader } from "@/components/common/ImageUploader";
import { CharCount } from "@/components/common/CharCount";
import { useAdaptiveCaptcha } from "@/components/common/useAdaptiveCaptcha";
import { useToast } from "@/components/common/Toast";

type Props = { open: boolean; onClose: () => void; isLoggedIn: boolean; defaultName?: string; onSuccess?: () => void; maxImages?: number; categories?: { slug: string; name: string }[]; conditions?: { slug: string; name: string }[] };

export function ClassifiedPostModal({ open, onClose, isLoggedIn, defaultName = "", onSuccess, maxImages = 8, categories, conditions }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ClassifiedCategory | "">("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [priceText, setPriceText] = useState("");
  const [condition, setCondition] = useState<string>("");
  const [wardSlug, setWardSlug] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [contactName, setContactName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hidePhone, setHidePhone] = useState(false);

  const [loading, setLoading] = useState(false);
  const [doneSlug, setDoneSlug] = useState<string | null>(null);
  const { toast } = useToast();
  const cap = useAdaptiveCaptcha();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    // Khóa cuộn nền khi modal mở — tránh "scroll bleed" trên điện thoại (iOS/Android).
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Danh mục & tình trạng từ DB (prop) — admin quản lý ở /admin/danh-muc.
  const catOptions = useMemo(() => (categories ?? []).map((c) => ({ value: c.slug, label: c.name })), [categories]);
  const condOptions = useMemo(() => (conditions ?? []).map((c) => ({ value: c.slug, label: c.name })), [conditions]);
  const wardOptions = useMemo(() => WARDS.map((w) => ({ value: w.slug, label: w.name, hint: `Xã mới: ${w.newCommune}` })), []);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Vui lòng nhập tiêu đề."); return; }
    if (!category || !catOptions.some((c) => c.value === category)) { toast.error("Vui lòng chọn danh mục."); return; }
    if (!description.trim()) { toast.error("Vui lòng nhập mô tả."); return; }
    const ward = WARDS.find((w) => w.slug === wardSlug);
    if (!ward) { toast.error("Vui lòng chọn địa điểm."); return; }
    const phoneClean = phone.replace(/[\s.\-()]/g, "");
    if (!/^(?:0\d{9}|\+84\d{9})$/.test(phoneClean)) { toast.error("Số điện thoại không hợp lệ (VD: 0912345678)."); return; }
    if (!contactName.trim()) { toast.error("Vui lòng nhập tên liên hệ."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/mua-ban", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), category, description, images,
          priceText: priceText.trim() || undefined, condition: condition || undefined,
          location: { wardSlug: ward.slug, address: address.trim() || undefined, mapUrl: mapUrl.trim() || undefined },
          contact: { name: contactName.trim(), phone: phoneClean, email: email.trim() || undefined, hidePhone },
          recaptchaToken: cap.token(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      cap.reset();
      if (cap.challenged(res, data)) { toast.error("Vui lòng xác nhận reCAPTCHA rồi gửi lại."); return; }
      if (!res.ok) { toast.error(data.error || "Đăng tin thất bại."); return; }
      setDoneSlug(data.slug || ""); onSuccess?.();
    } catch { toast.error("Lỗi kết nối, vui lòng thử lại."); } finally { setLoading(false); }
  }

  const Close = (
    <button className="qp-modal__close" type="button" aria-label="Đóng" onClick={onClose}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal qp-modal--wide" role="dialog" aria-modal="true" aria-label="Đăng tin mua bán" onClick={(e) => e.stopPropagation()}>
        <div className="qp-modal__head"><h2 className="type-h3">Đăng tin mua bán</h2>{Close}</div>

        {!isLoggedIn ? (
          <div className="qp-modal__body qp-lf-modal__auth">
            <p className="type-body">Bạn cần <b>đăng nhập</b> để đăng tin mua bán.</p>
            <div className="qp-lf-modal__authbtns">
              <Link href="/dang-nhap" className="qp-btn-primary">Đăng nhập</Link>
              <Link href="/dang-ky" className="qp-btn-secondary">Đăng ký</Link>
            </div>
          </div>
        ) : doneSlug !== null ? (
          <div className="qp-modal__body qp-lf-modal__done">
            <div className="qp-alert is-success" role="status">
              <svg className="qp-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
              <div className="qp-alert__body"><strong>Đã gửi tin!</strong>Tin của bạn đang chờ ban quản trị duyệt trước khi hiển thị công khai.</div>
            </div>
            <button type="button" className="qp-btn-primary qp-btn-block" onClick={onClose}>Đóng</button>
          </div>
        ) : (
          <form className="qp-modal__body qp-lf-modal__form" onSubmit={onSubmit}>
            <div className="qp-form-group">
              <label className="qp-label" htmlFor="cl-title">Tiêu đề <span className="req">*</span><CharCount value={title} max={140} /></label>
              <input id="cl-title" className="qp-input" required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Bán xe máy Honda Wave 2019" />
            </div>

            <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
              <div className="qp-form-group">
                <label className="qp-label">Danh mục <span className="req">*</span></label>
                <Combobox options={catOptions} value={category} onChange={(v) => setCategory(v as ClassifiedCategory)} placeholder="— Chọn danh mục —" searchPlaceholder="Tìm danh mục…" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="cl-price">Giá<CharCount value={priceText} max={60} /></label>
                <input id="cl-price" className="qp-input" maxLength={60} value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="VD: 8.500.000đ / Thỏa thuận" />
              </div>
            </div>

            <div className="qp-form-group">
              <span className="qp-label">Mô tả chi tiết <span className="req">*</span></span>
              <RichTextEditor value={description} onChange={setDescription} placeholder="Mô tả món đồ, tình trạng, lý do bán…" />
            </div>

            <div className="qp-form-group">
              <span className="qp-label">Ảnh món đồ (tuỳ chọn)</span>
              <ImageUploader value={images} onChange={setImages} max={maxImages} />
            </div>

            <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
              <div className="qp-form-group">
                <label className="qp-label">Địa điểm <span className="req">*</span></label>
                <Combobox options={wardOptions} value={wardSlug} onChange={setWardSlug} placeholder="— Chọn xã/thị trấn —" searchPlaceholder="Tìm xã/thị trấn…" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="cl-cond">Tình trạng</label>
                <select id="cl-cond" className="qp-select" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option value="">— Không rõ —</option>
                  {condOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="cl-addr">Địa chỉ cụ thể<CharCount value={address} max={200} /></label>
              <input id="cl-addr" className="qp-input" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="VD: Thôn …, gần chợ …" />
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="cl-map">Link Google Maps (tuỳ chọn)</label>
              <input id="cl-map" type="url" inputMode="url" className="qp-input" maxLength={500} value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="Dán link Google Maps (nút Chia sẻ)" />
              <p className="qp-form-tip">Mở Google Maps → chọn vị trí → Chia sẻ → copy link dán vào đây. Bản đồ sẽ hiện ngay ở trang tin.</p>
            </div>

            <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="cl-name">Người liên hệ <span className="req">*</span><CharCount value={contactName} max={80} /></label>
                <input id="cl-name" className="qp-input" required maxLength={80} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="cl-phone">Số điện thoại <span className="req">*</span></label>
                <input id="cl-phone" type="tel" className="qp-input" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" />
              </div>
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="cl-email">Email (không bắt buộc)<CharCount value={email} max={120} /></label>
              <input id="cl-email" type="email" className="qp-input" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@cua-ban.com" />
            </div>

            <label className="qp-check">
              <input type="checkbox" checked={hidePhone} onChange={(e) => setHidePhone(e.target.checked)} /> Ẩn số điện thoại công khai
            </label>

            {cap.slot}

            <button className="qp-btn-primary qp-btn-block mt-6" type="submit" disabled={loading}>
              {loading ? "Đang gửi…" : <>Đăng tin <span className="qp-arrow">→</span></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
