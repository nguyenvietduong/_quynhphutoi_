"use client";

// Cấu hình hệ thống — full trang, tab dọc + công tắc gạt. Lưu DB, áp dụng ngay.
import { useState } from "react";
import type { AppSettings } from "@/lib/settings";
import { useToast } from "@/components/common/Toast";

type Tab = "post" | "comment" | "security" | "contact" | "seo" | "data";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "post", label: "Đăng tin", icon: "📝" },
  { key: "comment", label: "Bình luận & tương tác", icon: "💬" },
  { key: "security", label: "Bảo mật & tài khoản", icon: "🔒" },
  { key: "contact", label: "Liên hệ & chung", icon: "📞" },
  { key: "seo", label: "SEO toàn site", icon: "🔎" },
  { key: "data", label: "Dữ liệu mẫu", icon: "🌱" },
];

export function SettingsManager({ initial }: { initial: AppSettings }) {
  const [form, setForm] = useState<AppSettings>(initial);
  const [tab, setTab] = useState<Tab>("post");
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  function set<K extends keyof AppSettings>(k: K, v: AppSettings[K]) { setForm((f) => ({ ...f, [k]: v })); }
  const num = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never);
  const txt = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value as never);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Lưu thất bại."); return; }
      if (data.settings) setForm(data.settings);
      toast.success("Đã lưu cấu hình. Áp dụng ngay cho lượt truy cập tiếp theo.");
    } finally { setBusy(false); }
  }

  async function seedDemo() {
    if (seeding) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Nạp dữ liệu thất bại."); return; }
      const report: { label: string; status: string; count: number }[] = data.report ?? [];
      const seeded = report.filter((r) => r.status === "seeded");
      const skipped = report.filter((r) => r.status === "skipped");
      if (seeded.length) toast.success(`Đã nạp: ${seeded.map((r) => `${r.label} (${r.count})`).join(", ")}.`);
      if (skipped.length) toast.info(`Bỏ qua (đã có dữ liệu): ${skipped.map((r) => r.label).join(", ")}.`);
      if (!seeded.length && !skipped.length) toast.info("Không có gì để nạp.");
    } catch {
      toast.error("Lỗi kết nối khi nạp dữ liệu.");
    } finally { setSeeding(false); }
  }

  const Toggle = ({ k, label, desc, warn }: { k: keyof AppSettings; label: string; desc?: string; warn?: boolean }) => (
    <label className="qp-switch-row">
      <span className="qp-switch-row__text"><b>{label}</b>{desc && <small>{desc}</small>}</span>
      <span className={`qp-switch${warn ? " is-warn" : ""}`}>
        <input type="checkbox" checked={form[k] as boolean} onChange={(e) => set(k, e.target.checked as never)} />
        <span className="qp-switch__track" />
      </span>
    </label>
  );

  return (
    <form className="qp-settings" onSubmit={submit}>
      <nav className="qp-settings__nav">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`qp-settings__tab${tab === t.key ? " is-active" : ""}`} onClick={() => setTab(t.key)}>
            <span aria-hidden>{t.icon}</span> {t.label}
          </button>
        ))}
        <button type="submit" className="qp-btn-primary qp-btn-block" disabled={busy} style={{ marginTop: "var(--space-4)" }}>
          {busy ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
      </nav>

      <div className="qp-settings__panel">
        {tab === "post" && (
          <>
            <Card title="Hạn mức đăng tin" desc="Chống spam — áp dụng chung cho Việc làm · Tìm đồ rơi · Mua bán.">
              <div className="qp-acc-grid2">
                <Field label="Số tin tối đa / ngày / người" hint="Hết hạn mức → đợi sang hôm sau.">
                  <input type="number" min={1} max={100} className="qp-input" value={form.postDailyMax} onChange={num("postDailyMax")} />
                </Field>
                <Field label="Số ảnh tối đa mỗi tin">
                  <input type="number" min={1} max={20} className="qp-input" value={form.postMaxImages} onChange={num("postMaxImages")} />
                </Field>
                <Field label="Số ảnh tối đa mỗi quảng cáo" hint="Thư viện ảnh hiển thị ở trang chi tiết quảng cáo.">
                  <input type="number" min={1} max={20} className="qp-input" value={form.adMaxImages} onChange={num("adMaxImages")} />
                </Field>
                <Field label="Thời gian chờ cơ bản (phút)" hint="Khoảng cách tối thiểu giữa 2 tin.">
                  <input type="number" min={0} max={1440} className="qp-input" value={form.postCooldownMin} onChange={num("postCooldownMin")} />
                </Field>
                <Field label="Trần thời gian chờ (phút)" hint="Đăng liên tục → chờ tăng dần tới mức này.">
                  <input type="number" min={0} max={1440} className="qp-input" value={form.postCooldownMax} onChange={num("postCooldownMax")} />
                </Field>
              </div>
            </Card>
            <Card title="Kiểm duyệt & phân hệ" desc="Bật/tắt nhanh từng tính năng đăng tin.">
              <Toggle k="postRequireApproval" label="Bắt buộc duyệt tin" desc="Tin chỉ hiện công khai sau khi admin duyệt." warn={!form.postRequireApproval} />
              <Toggle k="jobsPostEnabled" label="Cho phép đăng Việc làm" />
              <Toggle k="lostfoundPostEnabled" label="Cho phép đăng Tìm đồ rơi" />
              <Toggle k="classifiedsPostEnabled" label="Cho phép đăng Mua bán" />
            </Card>
          </>
        )}

        {tab === "comment" && (
          <Card title="Bình luận & tương tác">
            <Toggle k="commentsEnabled" label="Cho phép bình luận" desc="Áp dụng toàn site (tin tức, tìm đồ rơi, các trang chi tiết)." />
            <Toggle k="likesEnabled" label="Cho phép thích (like)" />
            <div className="qp-acc-grid2" style={{ marginTop: 16 }}>
              <Field label="Độ dài tối đa 1 bình luận"><input type="number" min={50} max={5000} className="qp-input" value={form.commentMaxLength} onChange={num("commentMaxLength")} /></Field>
              <Field label="Số bình luận tối đa / phút / người"><input type="number" min={1} max={60} className="qp-input" value={form.commentMaxPerMin} onChange={num("commentMaxPerMin")} /></Field>
            </div>
          </Card>
        )}

        {tab === "security" && (
          <Card title="Bảo mật & tài khoản">
            <Field label={'reCAPTCHA v2 (ô tick "Tôi không phải robot")'} hint="Cấu hình bằng biến môi trường NEXT_PUBLIC_RECAPTCHA_SITE_KEY và RECAPTCHA_SECRET_KEY. Chưa đặt khóa thì các form vẫn gửi được (bỏ qua kiểm tra).">
              <span className="type-body-small" style={{ opacity: 0.7 }}>Ô tick sẽ tự hiện trên các form khi đã cấu hình khóa.</span>
            </Field>
            <div style={{ marginTop: 8 }}>
              <Toggle k="registerEnabled" label="Cho phép đăng ký tài khoản mới" desc="Tắt để tạm dừng nhận tài khoản mới." />
            </div>
          </Card>
        )}

        {tab === "contact" && (
          <>
            <Card title="Thông tin liên hệ" desc="Hiển thị ở chân trang của cổng.">
              <div className="qp-acc-grid2">
                <Field label="Email liên hệ"><input type="email" maxLength={120} className="qp-input" value={form.contactEmail} onChange={txt("contactEmail")} /></Field>
                <Field label="Hotline (tuỳ chọn)"><input maxLength={40} className="qp-input" value={form.contactHotline} onChange={txt("contactHotline")} placeholder="VD: 0912 345 678" /></Field>
                <Field label="Địa điểm"><input maxLength={120} className="qp-input" value={form.contactLocation} onChange={txt("contactLocation")} /></Field>
                <Field label="Ghi chú liên hệ"><input maxLength={120} className="qp-input" value={form.contactNote} onChange={txt("contactNote")} /></Field>
              </div>
            </Card>
            <Card title="Mạng xã hội" desc="Để trống = ẩn biểu tượng tương ứng ở chân trang.">
              <div className="qp-acc-grid2">
                <Field label="Facebook URL"><input maxLength={200} className="qp-input" value={form.socialFacebook} onChange={txt("socialFacebook")} placeholder="https://facebook.com/..." /></Field>
                <Field label="YouTube URL"><input maxLength={200} className="qp-input" value={form.socialYoutube} onChange={txt("socialYoutube")} placeholder="https://youtube.com/..." /></Field>
                <Field label="Zalo URL"><input maxLength={200} className="qp-input" value={form.socialZalo} onChange={txt("socialZalo")} placeholder="https://zalo.me/..." /></Field>
              </div>
            </Card>
          </>
        )}

        {tab === "seo" && (
          <>
            <Card title="Nhận diện & metadata" desc="Áp dụng cho thẻ <title>, mô tả và ảnh chia sẻ của TOÀN site. Để trống ô nào → dùng giá trị mặc định cài sẵn. Có hiệu lực ngay, không cần build lại.">
              <Field label="Tên site" hint="Dùng cho tiêu đề mặc định và hậu tố mọi trang: “Tên trang · Tên site”. Trống = “Cổng thông tin Quỳnh Phụ”.">
                <input maxLength={80} className="qp-input" value={form.seoSiteName} onChange={txt("seoSiteName")} placeholder="Cổng thông tin Quỳnh Phụ" />
              </Field>
              <Field label="Mô tả mặc định" hint="Hiển thị dưới tiêu đề trên Google cho trang chủ và trang không có mô tả riêng (≈ 160 ký tự).">
                <textarea maxLength={300} className="qp-textarea" value={form.seoSiteDescription} onChange={(e) => set("seoSiteDescription", e.target.value as never)} placeholder="Cổng thông tin huyện Quỳnh Phụ — tin tức, việc làm, mua bán…" />
              </Field>
              <Field label="Từ khoá gốc (cách nhau dấu phẩy)" hint="Trống = bộ từ khoá mặc định về Quỳnh Phụ.">
                <textarea maxLength={400} className="qp-textarea" value={form.seoDefaultKeywords} onChange={(e) => set("seoDefaultKeywords", e.target.value as never)} placeholder="Quỳnh Phụ, Thái Bình, tin tức Quỳnh Phụ, việc làm Quỳnh Phụ…" />
              </Field>
              <Field label="Ảnh OG mặc định (URL)" hint="Ảnh khi chia sẻ link lên Facebook/Zalo. Trống = ảnh OG động tự sinh (/opengraph-image). Khuyến nghị 1200×630.">
                <input maxLength={500} className="qp-input" value={form.seoDefaultOgImage} onChange={txt("seoDefaultOgImage")} placeholder="/img/og-default.png hoặc https://…" />
              </Field>
            </Card>
            <Card title="Xác minh quyền sở hữu" desc="Dán mã xác minh để kết nối công cụ quản trị tìm kiếm. Mã được chèn vào thẻ <meta> ở mọi trang.">
              <div className="qp-acc-grid2">
                <Field label="Google Search Console" hint="Chỉ dán phần content của thẻ google-site-verification.">
                  <input maxLength={200} className="qp-input" value={form.seoVerificationGoogle} onChange={txt("seoVerificationGoogle")} placeholder="VD: abcDEF123…" />
                </Field>
                <Field label="Bing Webmaster" hint="Mã msvalidate.01.">
                  <input maxLength={200} className="qp-input" value={form.seoVerificationBing} onChange={txt("seoVerificationBing")} placeholder="VD: 0123ABC…" />
                </Field>
              </div>
            </Card>
          </>
        )}

        {tab === "data" && (
          <Card title="Nạp dữ liệu mẫu" desc="Nạp dữ liệu mẫu cho Dịch vụ công (Trường học · Y tế · Giao thông · Chợ) và Khám phá (Di tích · Đơn vị hành chính · Tổng quan). CHỈ nạp vào mục đang TRỐNG — KHÔNG ghi đè dữ liệu hiện có. Dùng 1 lần sau khi deploy lên cơ sở dữ liệu mới.">
            <button type="button" className="qp-btn-primary" disabled={seeding} onClick={seedDemo}>
              {seeding ? "Đang nạp…" : "Nạp dữ liệu mẫu"}
            </button>
          </Card>
        )}
      </div>
    </form>
  );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="qp-chart-card">
      <div className="qp-set-section__title">{title}</div>
      {desc ? <p className="qp-set-section__desc">{desc}</p> : <div style={{ height: 12 }} />}
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="qp-form-group">
      <label className="qp-label">{label}</label>
      {children}
      {hint && <span className="type-body-small text-muted">{hint}</span>}
    </div>
  );
}
