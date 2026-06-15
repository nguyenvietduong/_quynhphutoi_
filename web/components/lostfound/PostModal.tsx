"use client";

// Modal đăng tin Tìm đồ rơi — POST /api/lost-found (yêu cầu đăng nhập).
// Tin gửi lên ở trạng thái chờ duyệt (approved=false) nên chưa hiện công khai ngay.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { WARDS } from "@/lib/wards";
import { Combobox } from "./Combobox";
import { RichTextEditor } from "./RichTextEditor";
import { ImageUploader } from "@/components/common/ImageUploader";
import { CharCount } from "@/components/common/CharCount";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

export type CategoryOption = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  categoryOptions: CategoryOption[];
  isLoggedIn: boolean;
  defaultName?: string;
  onSuccess?: () => void;  // gọi sau khi đăng tin thành công (vd refresh trang)
  maxImages?: number;      // số ảnh tối đa (đồng bộ settings.postMaxImages)
};

const KINDS = [
  { value: "tim-do", label: "Tôi mất đồ — tìm lại" },
  { value: "nhat-duoc", label: "Tôi nhặt được đồ" },
] as const;

export function PostModal({ open, onClose, categoryOptions, isLoggedIn, defaultName = "", onSuccess, maxImages = 8 }: Props) {
  const [kind, setKind] = useState<"tim-do" | "nhat-duoc">("tim-do");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [wardSlug, setWardSlug] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [reward, setReward] = useState("");
  const [contactName, setContactName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hidePhone, setHidePhone] = useState(false);

  const [loading, setLoading] = useState(false);
  const [doneSlug, setDoneSlug] = useState<string | null>(null);
  const { toast } = useToast();
  const captcha = useRef<RecaptchaHandle>(null);

  // Đóng bằng phím Esc.
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

  // Option cho combobox.
  const catCombo = useMemo(() => categoryOptions.map((c) => ({ value: c.id, label: c.label })), [categoryOptions]);
  const wardCombo = useMemo(() => WARDS.map((w) => ({ value: w.slug, label: w.name, hint: `Xã mới: ${w.newCommune}` })), []);
  // Ngày HÔM NAY theo giờ địa phương (KHÔNG dùng toISOString — nó trả giờ UTC,
  // lệch -1 ngày so với VN từ 00:00–07:00 sáng → chặn nhầm "hôm nay").
  const _d = new Date();
  const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;

  if (!open) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim()) { toast.error("Vui lòng nhập tiêu đề."); return; }
    const cat = categoryOptions.find((c) => c.id === categoryId);
    if (!cat) { toast.error("Vui lòng chọn danh mục."); return; }
    if (!description.trim()) { toast.error("Vui lòng nhập mô tả chi tiết."); return; }
    const ward = WARDS.find((w) => w.slug === wardSlug);
    if (!ward) { toast.error("Vui lòng chọn xã / thị trấn."); return; }

    // Ngày mất/nhặt không được ở tương lai.
    if (occurredAt && occurredAt > todayStr) {
      toast.error(`Ngày ${kind === "tim-do" ? "mất" : "nhặt được"} không thể ở tương lai.`); return;
    }

    // Số điện thoại VN: 0xxxxxxxxx (10 số) hoặc +84xxxxxxxxx.
    const phoneClean = phone.replace(/[\s.\-()]/g, "");
    if (!/^(?:0\d{9}|\+84\d{9})$/.test(phoneClean)) {
      toast.error("Số điện thoại không hợp lệ (VD: 0912345678)."); return;
    }
    if (!contactName.trim()) { toast.error("Vui lòng nhập tên liên hệ."); return; }

    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/lost-found", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          description,
          images,
          categoryId: cat.id,
          location: { wardSlug: ward.slug, address: address.trim() || undefined, mapUrl: mapUrl.trim() || undefined },
          occurredAt: occurredAt || undefined,
          contact: { name: contactName.trim(), phone: phoneClean, email: email.trim() || undefined, hidePhone },
          // Hậu tạ chỉ áp dụng cho tin "tìm đồ".
          reward: kind === "tim-do" ? (reward.trim() || undefined) : undefined,
          recaptchaToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      captcha.current?.reset();
      if (!res.ok) {
        toast.error(data.error || "Đăng tin thất bại, vui lòng thử lại.");
        return;
      }
      setDoneSlug(data.slug || "");
      onSuccess?.();
    } catch {
      toast.error("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  const CloseBtn = (
    <button className="qp-modal__close" type="button" aria-label="Đóng" onClick={onClose}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal qp-modal--wide" role="dialog" aria-modal="true" aria-label="Đăng tin tìm đồ rơi" onClick={(e) => e.stopPropagation()}>
        <div className="qp-modal__head">
          <h2 className="type-h3">Đăng tin tìm đồ rơi</h2>
          {CloseBtn}
        </div>

        {/* Chưa đăng nhập */}
        {!isLoggedIn ? (
          <div className="qp-modal__body qp-lf-modal__auth">
            <p className="type-body">Bạn cần <b>đăng nhập</b> để đăng tin tìm đồ / nhặt được đồ.</p>
            <div className="qp-lf-modal__authbtns">
              <Link href="/dang-nhap" className="qp-btn-primary">Đăng nhập</Link>
              <Link href="/dang-ky" className="qp-btn-secondary">Đăng ký</Link>
            </div>
          </div>
        ) : doneSlug !== null ? (
          /* Gửi thành công */
          <div className="qp-modal__body qp-lf-modal__done">
            <div className="qp-alert is-success" role="status">
              <svg className="qp-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <div className="qp-alert__body">
                <strong>Đã gửi tin!</strong>
                Tin của bạn đang chờ ban quản trị duyệt trước khi hiển thị công khai.
              </div>
            </div>
            <button type="button" className="qp-btn-primary qp-btn-block" onClick={onClose}>Đóng</button>
          </div>
        ) : (
          /* Form đăng tin */
          <form className="qp-modal__body qp-lf-modal__form" onSubmit={onSubmit}>
            {/* Loại tin — select */}
            <div className="qp-form-group">
              <label className="qp-label" htmlFor="lf-kind">Loại tin <span className="req">*</span></label>
              <select id="lf-kind" className="qp-select" value={kind} onChange={(e) => setKind(e.target.value as "tim-do" | "nhat-duoc")}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>

            {/* Danh mục — Combobox tìm kiếm */}
            <div className="qp-form-group">
              <label className="qp-label" htmlFor="lf-cat">Danh mục <span className="req">*</span></label>
              <Combobox id="lf-cat" options={catCombo} value={categoryId} onChange={setCategoryId}
                placeholder="— Chọn danh mục —" searchPlaceholder="Gõ: CCCD, điện thoại, chó…" />
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="lf-title">Tiêu đề <span className="req">*</span><CharCount value={title} max={140} /></label>
              <input id="lf-title" className="qp-input" required maxLength={140} value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === "tim-do" ? "VD: Đánh rơi CCCD tại chợ Quỳnh Côi" : "VD: Nhặt được ví tiền gần QL10"} />
            </div>

            <div className="qp-form-group">
              <span className="qp-label">Mô tả chi tiết <span className="req">*</span></span>
              <RichTextEditor value={description} onChange={setDescription}
                placeholder="Mô tả đặc điểm món đồ, thời điểm, hoàn cảnh… để dễ xác minh." />
            </div>

            <div className="qp-form-group">
              <span className="qp-label">Ảnh món đồ (tuỳ chọn)</span>
              <ImageUploader value={images} onChange={setImages} max={maxImages} />
            </div>

            <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="lf-ward">Xã / Thị trấn <span className="req">*</span></label>
                <Combobox id="lf-ward" options={wardCombo} value={wardSlug} onChange={setWardSlug}
                  placeholder="— Chọn địa điểm —" searchPlaceholder="Gõ tên xã/thị trấn…" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="lf-date">{kind === "tim-do" ? "Ngày mất" : "Ngày nhặt được"}</label>
                <input id="lf-date" type="date" className="qp-input" max={todayStr} value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
              </div>
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="lf-addr">Địa chỉ / vị trí cụ thể<CharCount value={address} max={200} /></label>
              <input id="lf-addr" className="qp-input" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: Gần ngã tư chợ, thôn An Khoai…" />
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="lf-map">Link Google Maps (tuỳ chọn)</label>
              <input id="lf-map" type="url" inputMode="url" className="qp-input" maxLength={500} value={mapUrl} onChange={(e) => setMapUrl(e.target.value)}
                placeholder="Dán link Google Maps (nút Chia sẻ)" />
              <p className="qp-form-tip">Mở Google Maps → chọn vị trí → Chia sẻ → copy link dán vào đây. Bản đồ sẽ hiện ngay ở trang tin.</p>
            </div>

            {kind === "tim-do" && (
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="lf-reward">Hậu tạ (nếu có)<CharCount value={reward} max={100} /></label>
                <input id="lf-reward" className="qp-input" maxLength={100} value={reward} onChange={(e) => setReward(e.target.value)}
                  placeholder="VD: Hậu tạ 200.000đ" />
              </div>
            )}

            <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="lf-name">Tên liên hệ <span className="req">*</span><CharCount value={contactName} max={80} /></label>
                <input id="lf-name" className="qp-input" required maxLength={80} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="lf-phone">Số điện thoại <span className="req">*</span></label>
                <input id="lf-phone" type="tel" className="qp-input" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" />
              </div>
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="lf-email">Email (không bắt buộc)<CharCount value={email} max={120} /></label>
              <input id="lf-email" type="email" className="qp-input" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@cua-ban.com" />
            </div>

            <label className="qp-check">
              <input type="checkbox" checked={hidePhone} onChange={(e) => setHidePhone(e.target.checked)} />
              Ẩn số điện thoại công khai (người xem liên hệ qua trang tin)
            </label>

            <Recaptcha ref={captcha} className="qp-recaptcha" />

            <button className="qp-btn-primary qp-btn-block mt-6" type="submit" disabled={loading}>
              {loading ? "Đang gửi…" : <>Đăng tin <span className="qp-arrow">→</span></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
