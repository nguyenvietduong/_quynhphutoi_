"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/common/Toast";
import { FilterSelect, type FilterOption } from "@/components/admin/FilterSelect";
import { SeoFieldsEditor } from "@/components/admin/SeoFieldsEditor";
import type { SeoFields } from "@/lib/seo-fields";

export type TransitForm = {
  name: string; type: string;
  origin: string; destination: string; stops: string;
  operator: string; phone: string; fare: string;
  frequency: string; duration: string; distance: string; note: string;
  verified: boolean; active: boolean;
  seo?: SeoFields;
};

export const TRANSIT_FORM_EMPTY: TransitForm = {
  name: "", type: "",
  origin: "", destination: "", stops: "",
  operator: "", phone: "", fare: "",
  frequency: "", duration: "", distance: "", note: "",
  verified: false, active: true, seo: undefined,
};

type CatOption = { slug: string; name: string };
type Tab = "route" | "ops" | "seo";
type AiProvider = "gemini" | "openai" | "custom";

const SVG_STAR = <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const SVG_EXT = <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ width: 13, height: 13, marginLeft: 4, flexShrink: 0 }}><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>;

export function TransitEditorPage({
  editingSlug, initialForm, typeOptions,
}: {
  editingSlug?: string;
  initialForm: TransitForm;
  typeOptions: CatOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<TransitForm>(initialForm);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("route");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");

  function set<K extends keyof TransitForm>(k: K, v: TransitForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nhập tên tuyến xe."); setTab("route"); return; }
    if (!form.type) { toast.error("Chọn loại tuyến."); setTab("route"); return; }
    if (!form.origin.trim()) { toast.error("Nhập điểm đầu."); setTab("route"); return; }
    if (!form.destination.trim()) { toast.error("Nhập điểm cuối."); setTab("route"); return; }
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(), type: form.type,
        origin: form.origin.trim(), destination: form.destination.trim(),
        stops: form.stops.split("\n").map((s) => s.trim()).filter(Boolean),
        operator: form.operator || undefined, phone: form.phone || undefined, fare: form.fare || undefined,
        frequency: form.frequency || undefined, duration: form.duration || undefined,
        distance: form.distance || undefined, note: form.note || undefined,
        verified: form.verified, active: form.active, seo: form.seo ?? {},
      };
      const res = await fetch(editingSlug ? `/api/admin/giao-thong/${editingSlug}` : "/api/admin/giao-thong",
        { method: editingSlug ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      toast.success(editingSlug ? "Đã cập nhật tuyến xe." : "Đã thêm tuyến xe mới.");
      router.push("/admin/giao-thong");
    } finally { setBusy(false); }
  }

  async function runAi() {
    if (!form.name.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/admin/ai/giao-thong", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, typeOptions, provider: aiProvider }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "AI thất bại."); return; }
      setForm((f) => ({
        ...f,
        type:        data.typeSlug   || f.type,
        origin:      data.origin     || f.origin,
        destination: data.destination || f.destination,
        stops:       Array.isArray(data.stops) ? data.stops.join("\n") : (data.stops || f.stops),
        operator:    data.operator   || f.operator,
        phone:       data.phone      || f.phone,
        fare:        data.fare       || f.fare,
        frequency:   data.frequency  || f.frequency,
        duration:    data.duration   || f.duration,
        distance:    data.distance   || f.distance,
        note:        data.note       || f.note,
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

  return (
    <>
    <div className="qp-admin-head">
      <Link href="/admin/giao-thong" className="qp-admin-head__eyebrow">Giao thông</Link>
      <h1 className="type-h1">{editingSlug ? "Sửa tuyến xe" : "Thêm tuyến xe"}</h1>
      {form.name && <span className="qp-admin-head__name">{form.name}</span>}
    </div>
    <form onSubmit={submit} className="qp-ae">
      <div className="qp-ae__topbar">
        <div className="qp-ae__tabbar">
          <button type="button" className={`qp-ae__tab-btn${tab === "route" ? " is-active" : ""}`} onClick={() => setTab("route")}>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            Tuyến xe
          </button>
          <button type="button" className={`qp-ae__tab-btn${tab === "ops" ? " is-active" : ""}`} onClick={() => setTab("ops")}>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
            Vận hành
          </button>
          <button type="button" className={`qp-ae__tab-btn${tab === "seo" ? " is-active" : ""}`} onClick={() => setTab("seo")}>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
            SEO &amp; Cài đặt
          </button>
        </div>
        <div className="qp-ae__headeractions">
          {editingSlug && (
            <a href={`/giao-thong/${editingSlug}`} target="_blank" rel="noopener noreferrer" className="qp-btn-outline">Xem trang{SVG_EXT}</a>
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
          <Link href="/admin/giao-thong" className="qp-btn-outline">Huỷ</Link>
          <button type="submit" className="qp-btn-primary" disabled={busy}>{busy ? "Đang lưu..." : editingSlug ? "Lưu thay đổi" : "Thêm tuyến"}</button>
        </div>
      </div>

      <div className="qp-ae__tabcontent">

        {tab === "route" && (
          <div className="qp-ae__tab-panel--detail">
            <div className="qp-ae__scard">
              <div className="qp-ae__scard-head">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                Thông tin tuyến
              </div>
              <div className="qp-ae__scard-body">
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Tên tuyến <span className="req">*</span></label>
                  <input className="qp-input" value={form.name} maxLength={200} onChange={(e) => set("name", e.target.value)} placeholder="VD: Quỳnh Côi – Hà Nội" />
                </div>
                <div className="qp-acc-grid2">
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Điểm đầu <span className="req">*</span></label>
                    <input className="qp-input" value={form.origin} maxLength={200} onChange={(e) => set("origin", e.target.value)} placeholder="VD: Bến xe Quỳnh Côi" />
                  </div>
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Điểm cuối <span className="req">*</span></label>
                    <input className="qp-input" value={form.destination} maxLength={200} onChange={(e) => set("destination", e.target.value)} placeholder="VD: Bến xe Mỹ Đình" />
                  </div>
                </div>
                <div className="qp-ae__field qp-ae__field--last">
                  <label className="qp-ae__flabel">Các điểm dừng (mỗi điểm một dòng)</label>
                  <textarea className="qp-textarea" rows={6} value={form.stops} onChange={(e) => set("stops", e.target.value)} placeholder={"Ngã tư An Bài\nKhu công nghiệp Đồng Văn\n..."} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div className="qp-ae__scard">
                <div className="qp-ae__scard-head">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" /></svg>
                  Loại tuyến
                </div>
                <div className="qp-ae__scard-body">
                  <div className="qp-ae__field qp-ae__field--last">
                    <label className="qp-ae__flabel">Loại <span className="req">*</span></label>
                    <FilterSelect options={typeOpts} value={form.type} onChange={(v) => set("type", v)} placeholder="Chọn loại tuyến" showSearch={false} />
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
                  <label className="qp-check"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Đã xác minh</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "ops" && (
          <div className="qp-ae__tab-panel--detail">
            <div className="qp-ae__scard">
              <div className="qp-ae__scard-head">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                Thông tin vận hành
              </div>
              <div className="qp-ae__scard-body">
                <div className="qp-acc-grid2">
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Nhà xe</label>
                    <input className="qp-input" value={form.operator} maxLength={100} onChange={(e) => set("operator", e.target.value)} placeholder="VD: Xe khách Sơn Hà" />
                  </div>
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">SĐT đặt vé</label>
                    <input className="qp-input" value={form.phone} maxLength={20} onChange={(e) => set("phone", e.target.value)} placeholder="0123 456 789" />
                  </div>
                </div>
                <div className="qp-acc-grid2">
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Giá vé</label>
                    <input className="qp-input" value={form.fare} maxLength={100} onChange={(e) => set("fare", e.target.value)} placeholder="VD: 70.000đ" />
                  </div>
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Tần suất</label>
                    <input className="qp-input" value={form.frequency} maxLength={100} onChange={(e) => set("frequency", e.target.value)} placeholder="VD: 30 phút/chuyến" />
                  </div>
                </div>
                <div className="qp-acc-grid2">
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Thời gian hành trình</label>
                    <input className="qp-input" value={form.duration} maxLength={50} onChange={(e) => set("duration", e.target.value)} placeholder="VD: 2 giờ" />
                  </div>
                  <div className="qp-ae__field">
                    <label className="qp-ae__flabel">Quãng đường</label>
                    <input className="qp-input" value={form.distance} maxLength={50} onChange={(e) => set("distance", e.target.value)} placeholder="VD: 110 km" />
                  </div>
                </div>
                <div className="qp-ae__field qp-ae__field--last">
                  <label className="qp-ae__flabel">Lưu ý</label>
                  <textarea className="qp-textarea" rows={4} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Lưu ý về lịch chạy, điểm đón, v.v." />
                </div>
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
