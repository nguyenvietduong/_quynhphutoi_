"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/common/Toast";
import { ImageUploader } from "@/components/common/ImageUploader";
import { FilterSelect, type FilterOption } from "@/components/admin/FilterSelect";
import { SeoFieldsEditor } from "@/components/admin/SeoFieldsEditor";
import { WARDS } from "@/lib/wards";
import type { SeoFields } from "@/lib/seo-fields";

export type HealthForm = {
  name: string; shortName: string;
  type: string; ownership: string;
  wardSlug: string; address: string;
  phone: string; email: string; website: string;
  director: string; hours: string; emergency: boolean; beds: string; specialties: string;
  foundedYear: string; description: string; image: string;
  verified: boolean; active: boolean; sourceUrl: string;
  seo?: SeoFields;
};

export const HEALTH_FORM_EMPTY: HealthForm = {
  name: "", shortName: "", type: "", ownership: "",
  wardSlug: WARDS[0]?.slug ?? "", address: "",
  phone: "", email: "", website: "",
  director: "", hours: "", emergency: false, beds: "", specialties: "",
  foundedYear: "", description: "", image: "",
  verified: false, active: true, sourceUrl: "", seo: undefined,
};

type CatOption = { slug: string; name: string };
type Tab = "info" | "address" | "seo";
type AiProvider = "gemini" | "openai" | "custom";

const WARD_OPTS: FilterOption[] = WARDS.map((w) => ({ value: w.slug, label: w.name }));

const SVG_STAR = <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const SVG_EXT = <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ width: 13, height: 13, marginLeft: 4, flexShrink: 0 }}><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>;

export function HealthEditorPage({
  editingSlug, initialForm, typeOptions, ownershipOptions,
}: {
  editingSlug?: string;
  initialForm: HealthForm;
  typeOptions: CatOption[];
  ownershipOptions: CatOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<HealthForm>(initialForm);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");

  function set<K extends keyof HealthForm>(k: K, v: HealthForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nhập tên cơ sở y tế."); setTab("info"); return; }
    if (!form.type) { toast.error("Chọn loại cơ sở."); setTab("info"); return; }
    if (!form.ownership) { toast.error("Chọn loại sở hữu."); setTab("info"); return; }
    if (!form.wardSlug) { toast.error("Chọn xã / thị trấn."); setTab("address"); return; }
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(), shortName: form.shortName || undefined,
        type: form.type, ownership: form.ownership,
        wardSlug: form.wardSlug, address: form.address || undefined,
        phone: form.phone || undefined, email: form.email || undefined, website: form.website || undefined,
        director: form.director || undefined, hours: form.hours || undefined, emergency: form.emergency,
        beds: form.beds ? Number(form.beds) : undefined, specialties: form.specialties || undefined,
        foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
        description: form.description || undefined, image: form.image || undefined,
        sourceUrl: form.sourceUrl || undefined, verified: form.verified, active: form.active, seo: form.seo ?? {},
      };
      const res = await fetch(editingSlug ? `/api/admin/y-te/${editingSlug}` : "/api/admin/y-te",
        { method: editingSlug ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      toast.success(editingSlug ? "Đã cập nhật cơ sở y tế." : "Đã thêm cơ sở y tế mới.");
      router.push("/admin/y-te");
    } finally { setBusy(false); }
  }

  async function runAi() {
    if (!form.name.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/admin/ai/y-te", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, typeOptions, ownershipOptions, wards: WARDS.map((w) => ({ slug: w.slug, name: w.name })), provider: aiProvider }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "AI thất bại."); return; }
      const matchedWard = data.wardSlug ? WARDS.find((w) => w.slug === data.wardSlug) : null;
      const resolvedWardSlug = matchedWard?.slug ?? "";
      const resolvedAddress = data.address?.trim() || (matchedWard ? `${matchedWard.name}, huyện Quỳnh Phụ, tỉnh Thái Bình` : "");
      setForm((f) => ({
        ...f,
        shortName:   data.shortName     || f.shortName,
        type:        data.typeSlug      || f.type,
        ownership:   data.ownershipSlug || f.ownership,
        wardSlug:    resolvedWardSlug   || f.wardSlug,
        address:     resolvedAddress    || f.address,
        phone:       data.phone         || f.phone,
        email:       data.email         || f.email,
        website:     data.website       || f.website,
        director:    data.director      || f.director,
        hours:       data.hours         || f.hours,
        specialties: data.specialties   || f.specialties,
        foundedYear: data.foundedYear   ? String(data.foundedYear) : f.foundedYear,
        description: data.description   || f.description,
        seo: {
          ...f.seo,
          metaTitle:       data.seoMetaTitle       || f.seo?.metaTitle       || "",
          metaDescription: data.seoMetaDescription || f.seo?.metaDescription || "",
          keywords:        data.seoKeywords ? data.seoKeywords.split(",").map((k: string) => k.trim()).filter(Boolean) : (f.seo?.keywords ?? []),
        },
      }));
      toast.success("AI đã điền thông tin — kiểm tra lại trước khi lưu.");
    } finally { setAiLoading(false); }
  }

  const typeOpts: FilterOption[] = typeOptions.map((o) => ({ value: o.slug, label: o.name }));
  const ownerOpts: FilterOption[] = ownershipOptions.map((o) => ({ value: o.slug, label: o.name }));

  return (
    <>
    <div className="qp-admin-head">
      <Link href="/admin/y-te" className="qp-admin-head__eyebrow">Y tế</Link>
      <h1 className="type-h1">{editingSlug ? "Sửa cơ sở y tế" : "Thêm cơ sở y tế"}</h1>
      {form.name && <span className="qp-admin-head__name">{form.name}</span>}
    </div>
    <form onSubmit={submit} className="qp-ae">
      <div className="qp-ae__topbar">
        <div className="qp-ae__tabbar">
          <button type="button" className={`qp-ae__tab-btn${tab === "info" ? " is-active" : ""}`} onClick={() => setTab("info")}>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" /></svg>
            Thông tin
          </button>
          <button type="button" className={`qp-ae__tab-btn${tab === "address" ? " is-active" : ""}`} onClick={() => setTab("address")}>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            Địa chỉ &amp; Ảnh
          </button>
          <button type="button" className={`qp-ae__tab-btn${tab === "seo" ? " is-active" : ""}`} onClick={() => setTab("seo")}>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
            SEO &amp; Cài đặt
          </button>
        </div>
        <div className="qp-ae__headeractions">
          {editingSlug && (
            <a href={`/y-te/${editingSlug}`} target="_blank" rel="noopener noreferrer" className="qp-btn-outline">Xem trang{SVG_EXT}</a>
          )}
          <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value as AiProvider)} disabled={aiLoading || busy}
            style={{ height: 32, padding: "0 8px", fontSize: 13, border: "1px solid var(--color-gray-border)", borderRadius: "var(--radius-sm)", background: "#fff", color: "var(--color-navy)", cursor: "pointer" }}>
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="custom">Tùy chỉnh</option>
          </select>
          <button type="button" className="qp-ae__import-btn" onClick={runAi} disabled={!form.name.trim() || aiLoading || busy} title="AI điền thông tin">
            {SVG_STAR}{aiLoading ? "Đang phân tích..." : "AI điền thông tin"}
          </button>
          <Link href="/admin/y-te" className="qp-btn-outline">Huỷ</Link>
          <button type="submit" className="qp-btn-primary" disabled={busy}>{busy ? "Đang lưu..." : editingSlug ? "Lưu thay đổi" : "Thêm cơ sở"}</button>
        </div>
      </div>

      <div className="qp-ae__tabcontent">

        {tab === "info" && (
          <div className="qp-ae__tab-panel--detail">
            <div className="qp-ae__scard">
              <div className="qp-ae__scard-head">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                Thông tin cơ bản
              </div>
              <div className="qp-ae__scard-body">
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Tên cơ sở <span className="req">*</span></label>
                  <input className="qp-input" value={form.name} maxLength={200} onChange={(e) => set("name", e.target.value)} placeholder="VD: Trạm Y tế xã Quỳnh Hồng" />
                </div>
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Tên viết tắt</label>
                  <input className="qp-input" value={form.shortName} maxLength={60} onChange={(e) => set("shortName", e.target.value)} placeholder="VD: TYT Quỳnh Hồng" />
                </div>
                <div className="qp-acc-grid2">
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Giám đốc / Trưởng trạm</label>
                    <input className="qp-input" value={form.director} maxLength={100} onChange={(e) => set("director", e.target.value)} />
                  </div>
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Năm thành lập</label>
                    <input type="number" className="qp-input" value={form.foundedYear} min={1900} max={2100} onChange={(e) => set("foundedYear", e.target.value)} placeholder="VD: 1975" />
                  </div>
                </div>
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Chuyên khoa chính</label>
                  <input className="qp-input" value={form.specialties} maxLength={200} onChange={(e) => set("specialties", e.target.value)} placeholder="VD: Nội khoa, Nhi khoa, Sản khoa" />
                </div>
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Link nguồn tham khảo</label>
                  <input className="qp-input" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://..." />
                </div>
                <div className="qp-ae__field qp-ae__field--last">
                  <label className="qp-ae__flabel">Mô tả</label>
                  <textarea className="qp-textarea" rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Giới thiệu về cơ sở y tế, dịch vụ, lịch sử..." />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div className="qp-ae__scard">
                <div className="qp-ae__scard-head">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" /></svg>
                  Phân loại
                </div>
                <div className="qp-ae__scard-body">
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Loại cơ sở <span className="req">*</span></label>
                    <FilterSelect options={typeOpts} value={form.type} onChange={(v) => set("type", v)} placeholder="Chọn loại cơ sở" showSearch={false} />
                  </div>
                  <div className="qp-ae__field qp-ae__field--last">
                    <label className="qp-ae__flabel">Loại sở hữu <span className="req">*</span></label>
                    <FilterSelect options={ownerOpts} value={form.ownership} onChange={(v) => set("ownership", v)} placeholder="Chọn loại sở hữu" showSearch={false} />
                  </div>
                </div>
              </div>
              <div className="qp-ae__scard">
                <div className="qp-ae__scard-head">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" /></svg>
                  Trạng thái
                </div>
                <div className="qp-ae__scard-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label className="qp-check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Hiển thị công khai</label>
                  <label className="qp-check"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Đã xác minh nguồn</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "address" && (
          <div className="qp-ae__tab-panel--detail">
            <div className="qp-ae__scard">
              <div className="qp-ae__scard-head">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                Địa chỉ &amp; Liên hệ
              </div>
              <div className="qp-ae__scard-body">
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Xã / Thị trấn <span className="req">*</span></label>
                  <FilterSelect options={WARD_OPTS} value={form.wardSlug} onChange={(v) => set("wardSlug", v)} placeholder="Chọn xã / thị trấn" searchPlaceholder="Tìm xã..." />
                </div>
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Địa chỉ chi tiết</label>
                  <input className="qp-input" value={form.address} maxLength={200} onChange={(e) => set("address", e.target.value)} placeholder="Thôn / xóm, đường..." />
                </div>
                <div className="qp-acc-grid2">
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Điện thoại</label>
                    <input className="qp-input" value={form.phone} maxLength={20} onChange={(e) => set("phone", e.target.value)} placeholder="0123 456 789" />
                  </div>
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Email</label>
                    <input type="email" className="qp-input" value={form.email} maxLength={100} onChange={(e) => set("email", e.target.value)} />
                  </div>
                </div>
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Website</label>
                  <input className="qp-input" value={form.website} maxLength={200} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
                </div>
                <div className="qp-acc-grid2">
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Giờ làm việc</label>
                    <input className="qp-input" value={form.hours} maxLength={100} onChange={(e) => set("hours", e.target.value)} placeholder="VD: 7:00–17:00" />
                  </div>
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Số giường bệnh</label>
                    <input type="number" className="qp-input" value={form.beds} min={0} onChange={(e) => set("beds", e.target.value)} placeholder="VD: 50" />
                  </div>
                </div>
                <div className="qp-ae__field qp-ae__field--last">
                  <label className="qp-check"><input type="checkbox" checked={form.emergency} onChange={(e) => set("emergency", e.target.checked)} /> Có cấp cứu 24/7</label>
                </div>
              </div>
            </div>
            <div className="qp-ae__scard">
              <div className="qp-ae__scard-head">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                Ảnh cơ sở
              </div>
              <div className="qp-ae__scard-body">
                <ImageUploader max={1} value={form.image ? [form.image] : []} onChange={(urls) => set("image", urls[0] ?? "")} subfolder="y-te" />
                <p className="qp-ae__cover-hint" style={{ marginTop: 8 }}>Khuyến nghị tỉ lệ 16:9 · tối thiểu 800×450 px.</p>
              </div>
            </div>
          </div>
        )}

        {tab === "seo" && (
          <div className="qp-ae__tab-panel">
            <SeoFieldsEditor value={form.seo} onChange={(seo) => set("seo", seo)} />
          </div>
        )}
      </div>
    </form>
    </>
  );
}
