"use client";

// Modal đăng tin tuyển dụng — POST /api/jobs (cần đăng nhập). Tin chờ admin duyệt.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { WARDS } from "@/lib/wards";
import { INDUSTRIES, JOB_TYPES, type JobType } from "@/lib/industries";
import { Combobox } from "@/components/lostfound/Combobox";
import { RichTextEditor } from "@/components/lostfound/RichTextEditor";
import { ImageUploader } from "@/components/common/ImageUploader";
import { CharCount } from "@/components/common/CharCount";
import { Recaptcha, RECAPTCHA_SITE_KEY, type RecaptchaHandle } from "@/components/common/Recaptcha";
import { useToast } from "@/components/common/Toast";

type Props = { open: boolean; onClose: () => void; isLoggedIn: boolean; defaultName?: string; onSuccess?: () => void; maxImages?: number };

export function JobPostModal({ open, onClose, isLoggedIn, defaultName = "", onSuccess, maxImages = 8 }: Props) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [jobType, setJobType] = useState<JobType>("toan-thoi-gian");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [wardSlug, setWardSlug] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [quantity, setQuantity] = useState("");
  const [experience, setExperience] = useState("");
  const [education, setEducation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contactName, setContactName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hidePhone, setHidePhone] = useState(false);

  const [loading, setLoading] = useState(false);
  const [doneSlug, setDoneSlug] = useState<string | null>(null);
  const { toast } = useToast();
  const captcha = useRef<RecaptchaHandle>(null);

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

  const indOptions = useMemo(() => INDUSTRIES.map((i) => ({ value: i.slug, label: i.name })), []);
  const typeOptions = useMemo(() => JOB_TYPES.map((t) => ({ value: t.slug, label: t.name })), []);
  const wardOptions = useMemo(() => WARDS.map((w) => ({ value: w.slug, label: w.name, hint: `Xã mới: ${w.newCommune}` })), []);
  // Ngày HÔM NAY theo giờ địa phương (KHÔNG dùng toISOString — nó trả giờ UTC,
  // lệch -1 ngày so với VN từ 00:00–07:00 sáng → cho chọn nhầm hạn nộp là hôm qua).
  const _d = new Date();
  const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;

  if (!open) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Vui lòng nhập vị trí tuyển dụng."); return; }
    if (!company.trim()) { toast.error("Vui lòng nhập tên nhà tuyển dụng."); return; }
    if (!INDUSTRIES.some((i) => i.slug === industry)) { toast.error("Vui lòng chọn ngành nghề."); return; }
    if (!description.trim()) { toast.error("Vui lòng nhập mô tả công việc."); return; }
    const ward = WARDS.find((w) => w.slug === wardSlug);
    if (!ward) { toast.error("Vui lòng chọn địa điểm làm việc."); return; }
    const phoneClean = phone.replace(/[\s.\-()]/g, "");
    if (!/^(?:0\d{9}|\+84\d{9})$/.test(phoneClean)) { toast.error("Số điện thoại không hợp lệ (VD: 0912345678)."); return; }
    if (!contactName.trim()) { toast.error("Vui lòng nhập tên liên hệ."); return; }

    const recaptchaToken = captcha.current?.getToken() ?? "";
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error('Vui lòng xác nhận "Tôi không phải robot".');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), company: company.trim(), industry, jobType, description, images,
          salary: { min: salaryMin || undefined, max: salaryMax || undefined, negotiable },
          location: { wardSlug: ward.slug, address: address.trim() || undefined, mapUrl: mapUrl.trim() || undefined },
          quantity: quantity || undefined, experience, education,
          deadline: deadline || undefined,
          contact: { name: contactName.trim(), phone: phoneClean, email: email.trim() || undefined, hidePhone },
          recaptchaToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      captcha.current?.reset();
      if (!res.ok) { toast.error(data.error || "Đăng tin thất bại."); return; }
      setDoneSlug(data.slug || "");
      onSuccess?.();
    } catch { toast.error("Lỗi kết nối, vui lòng thử lại."); } finally { setLoading(false); }
  }

  const Close = (
    <button className="qp-modal__close" type="button" aria-label="Đóng" onClick={onClose}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal qp-modal--wide" role="dialog" aria-modal="true" aria-label="Đăng tin tuyển dụng" onClick={(e) => e.stopPropagation()}>
        <div className="qp-modal__head"><h2 className="type-h3">Đăng tin tuyển dụng</h2>{Close}</div>

        {!isLoggedIn ? (
          <div className="qp-modal__body qp-lf-modal__auth">
            <p className="type-body">Bạn cần <b>đăng nhập</b> để đăng tin tuyển dụng.</p>
            <div className="qp-lf-modal__authbtns">
              <Link href="/dang-nhap" className="qp-btn-primary">Đăng nhập</Link>
              <Link href="/dang-ky" className="qp-btn-secondary">Đăng ký</Link>
            </div>
          </div>
        ) : doneSlug !== null ? (
          <div className="qp-modal__body qp-lf-modal__done">
            <div className="qp-alert is-success" role="status">
              <svg className="qp-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
              <div className="qp-alert__body"><strong>Đã gửi tin!</strong>Tin tuyển dụng đang chờ ban quản trị duyệt trước khi hiển thị công khai.</div>
            </div>
            <button type="button" className="qp-btn-primary qp-btn-block" onClick={onClose}>Đóng</button>
          </div>
        ) : (
          <form className="qp-modal__body qp-lf-modal__form" onSubmit={onSubmit}>
            <div className="qp-form-group">
              <label className="qp-label" htmlFor="jb-title">Vị trí tuyển dụng <span className="req">*</span><CharCount value={title} max={160} /></label>
              <input id="jb-title" className="qp-input" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Công nhân may, Kế toán tổng hợp…" />
            </div>
            <div className="qp-form-group">
              <label className="qp-label" htmlFor="jb-company">Nhà tuyển dụng <span className="req">*</span><CharCount value={company} max={120} /></label>
              <input id="jb-company" className="qp-input" required maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Tên công ty / cửa hàng / cá nhân" />
            </div>

            <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
              <div className="qp-form-group">
                <label className="qp-label">Ngành nghề <span className="req">*</span></label>
                <Combobox options={indOptions} value={industry} onChange={setIndustry} placeholder="— Chọn ngành —" searchPlaceholder="Tìm ngành…" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label">Loại hình <span className="req">*</span></label>
                <Combobox options={typeOptions} value={jobType} onChange={(v) => setJobType(v as JobType)} placeholder="— Chọn loại hình —" searchPlaceholder="Tìm…" />
              </div>
            </div>

            <div className="qp-form-group">
              <span className="qp-label">Mô tả công việc · yêu cầu · quyền lợi <span className="req">*</span></span>
              <RichTextEditor value={description} onChange={setDescription} placeholder="Mô tả công việc, yêu cầu ứng viên, quyền lợi…" />
            </div>

            <div className="qp-form-group">
              <span className="qp-label">Ảnh (tuỳ chọn)</span>
              <ImageUploader value={images} onChange={setImages} max={maxImages} />
            </div>

            {/* Lương */}
            <div className="qp-form-group">
              <label className="qp-label">Mức lương (triệu đồng/tháng)</label>
              <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
                <input className="qp-input" type="number" min={0} step={0.5} value={salaryMin} disabled={negotiable} onChange={(e) => setSalaryMin(e.target.value)} placeholder="Từ (VD: 7)" />
                <input className="qp-input" type="number" min={0} step={0.5} value={salaryMax} disabled={negotiable} onChange={(e) => setSalaryMax(e.target.value)} placeholder="Đến (VD: 12)" />
              </div>
              <label className="qp-check" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} /> Lương thỏa thuận
              </label>
            </div>

            <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
              <div className="qp-form-group">
                <label className="qp-label">Địa điểm làm việc <span className="req">*</span></label>
                <Combobox options={wardOptions} value={wardSlug} onChange={setWardSlug} placeholder="— Chọn xã/thị trấn —" searchPlaceholder="Tìm xã/thị trấn…" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="jb-deadline">Hạn nộp hồ sơ</label>
                <input id="jb-deadline" className="qp-input" type="date" min={todayStr} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="jb-addr">Địa chỉ cụ thể</label>
              <input id="jb-addr" className="qp-input" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="VD: Cụm CN Quỳnh Côi, QL10…" />
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="jb-map">Link Google Maps (tuỳ chọn)</label>
              <input id="jb-map" type="url" inputMode="url" className="qp-input" maxLength={500} value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="Dán link Google Maps (nút Chia sẻ)" />
              <p className="qp-form-tip">Mở Google Maps → chọn vị trí → Chia sẻ → copy link dán vào đây. Bản đồ sẽ hiện ngay ở trang tin.</p>
            </div>

            <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="jb-qty">Số lượng tuyển</label>
                <input id="jb-qty" className="qp-input" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="VD: 5" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="jb-edu">Trình độ</label>
                <input id="jb-edu" className="qp-input" maxLength={100} value={education} onChange={(e) => setEducation(e.target.value)} placeholder="VD: THPT, Cao đẳng…" />
              </div>
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="jb-exp">Kinh nghiệm</label>
              <input id="jb-exp" className="qp-input" maxLength={100} value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="VD: Không yêu cầu / 1–2 năm" />
            </div>

            <div className="grid grid-2" style={{ gap: "var(--space-4)" }}>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="jb-name">Người liên hệ <span className="req">*</span></label>
                <input id="jb-name" className="qp-input" required maxLength={80} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Phòng Nhân sự / Anh A" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label" htmlFor="jb-phone">Số điện thoại <span className="req">*</span></label>
                <input id="jb-phone" type="tel" className="qp-input" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" />
              </div>
            </div>

            <div className="qp-form-group">
              <label className="qp-label" htmlFor="jb-email">Email (không bắt buộc)</label>
              <input id="jb-email" type="email" className="qp-input" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tuyendung@congty.vn" />
            </div>

            <label className="qp-check">
              <input type="checkbox" checked={hidePhone} onChange={(e) => setHidePhone(e.target.checked)} /> Ẩn số điện thoại công khai
            </label>

            <Recaptcha ref={captcha} className="qp-recaptcha" />

            <button className="qp-btn-primary qp-btn-block mt-6" type="submit" disabled={loading}>
              {loading ? "Đang gửi…" : <>Đăng tin tuyển dụng <span className="qp-arrow">→</span></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
