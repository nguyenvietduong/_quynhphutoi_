"use client";

// Quản lý quảng cáo (admin): danh sách + thống kê + form thêm/sửa.
import { useState } from "react";
import { ImageUploader } from "@/components/common/ImageUploader";
import { RowActions } from "@/components/admin/RowActions";
import { useToast } from "@/components/common/Toast";

export type AdRow = {
  id: string; advertiser: string; title: string; description: string; imageDesktop: string; imageMobile: string;
  linkUrl: string; phone: string; placement: string; weight: number; startDate: string; endDate: string;
  active: boolean; impressions: number; clicks: number;
};

const PLACEMENTS = [
  { slug: "home-banner", label: "Banner trang chủ" },
  { slug: "footer", label: "Banner chân trang" },
  { slug: "detail-aside", label: "Box cột phải (chi tiết)" },
  { slug: "in-feed", label: "Native trong danh sách" },
  { slug: "sticky-bottom", label: "Thanh nổi đáy màn hình" },
];
const placeLabel = (s: string) => PLACEMENTS.find((p) => p.slug === s)?.label ?? s;

const EMPTY = { id: "", advertiser: "", title: "", description: "", imageDesktop: "", imageMobile: "", linkUrl: "", phone: "", placement: "home-banner", weight: 1, startDate: "", endDate: "", active: true, impressions: 0, clicks: 0 };

export function AdManager({ initial }: { initial: AdRow[] }) {
  const [rows, setRows] = useState<AdRow[]>(initial);
  const [form, setForm] = useState<AdRow>({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  function set<K extends keyof AdRow>(k: K, v: AdRow[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function reload() {
    const res = await fetch("/api/admin/ads", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (Array.isArray(data.ads)) setRows(data.ads);
  }

  function startNew() { setForm({ ...EMPTY }); setEditingId(null); setShowForm(true); }
  function startEdit(r: AdRow) { setForm({ ...r }); setEditingId(r.id); setShowForm(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.advertiser.trim() || !form.title.trim()) { toast.error("Nhập tên nhãn hàng và tiêu đề."); return; }
    if (!form.imageDesktop) { toast.error("Cần tải ảnh quảng cáo."); return; }
    // Link đích tuỳ chọn — chỉ kiểm định khi có nhập.
    if (form.linkUrl.trim() && !/^https?:\/\//i.test(form.linkUrl.trim())) { toast.error("Link đích phải bắt đầu bằng http(s)://"); return; }
    setBusy(true);
    try {
      const body = {
        advertiser: form.advertiser, title: form.title, description: form.description,
        imageDesktop: form.imageDesktop, imageMobile: form.imageMobile,
        linkUrl: form.linkUrl, phone: form.phone, placement: form.placement, weight: Number(form.weight) || 1,
        startDate: form.startDate || null, endDate: form.endDate || null, active: form.active,
      };
      const res = await fetch(editingId ? `/api/admin/ads/${editingId}` : "/api/admin/ads", {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      await reload();
      setShowForm(false);
      toast.success(editingId ? "Đã cập nhật quảng cáo." : "Đã thêm quảng cáo.");
    } finally { setBusy(false); }
  }

  async function toggleActive(r: AdRow) {
    setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)));
    await fetch(`/api/admin/ads/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !r.active }) }).catch(() => {});
  }

  async function remove(r: AdRow) {
    if (!confirm(`Xoá quảng cáo "${r.advertiser}"?`)) return;
    const res = await fetch(`/api/admin/ads/${r.id}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.id !== r.id));
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-acc-card__title qp-acc-card__title--row" style={{ marginBottom: 0 }}>
        <span>{rows.length} quảng cáo</span>
        <button type="button" className="qp-btn-primary" onClick={startNew}>+ Thêm quảng cáo</button>
      </div>

      {showForm && (
        <form className="qp-acc-card" onSubmit={submit}>
          <div className="qp-acc-card__title">{editingId ? "Sửa quảng cáo" : "Thêm quảng cáo mới"}</div>
          <div className="qp-acc-grid2">
            <div className="qp-form-group">
              <label className="qp-label">Nhãn hàng <span className="req">*</span></label>
              <input className="qp-input" value={form.advertiser} maxLength={80} onChange={(e) => set("advertiser", e.target.value)} placeholder="VD: Cửa hàng Điện máy ABC" />
            </div>
            <div className="qp-form-group">
              <label className="qp-label">Tiêu đề hiển thị <span className="req">*</span></label>
              <input className="qp-input" value={form.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder="VD: Khai trương — giảm 30%" />
            </div>
          </div>
          <div className="qp-acc-grid2">
            <div className="qp-form-group">
              <label className="qp-label">Vị trí hiển thị <span className="req">*</span></label>
              <select className="qp-select" value={form.placement} onChange={(e) => set("placement", e.target.value)}>
                {PLACEMENTS.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
              </select>
            </div>
            <div className="qp-form-group">
              <label className="qp-label">Link đích (tuỳ chọn)</label>
              <input className="qp-input" value={form.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} placeholder="https://… (để trống nếu chỉ liên hệ qua SĐT)" />
            </div>
          </div>
          <div className="qp-acc-grid2">
            <div className="qp-form-group">
              <label className="qp-label">SĐT liên hệ (tuỳ chọn)</label>
              <input className="qp-input" type="tel" value={form.phone} maxLength={20} onChange={(e) => set("phone", e.target.value)} placeholder="VD: 0987 654 321" />
            </div>
            <div className="qp-form-group">
              <label className="qp-label">Trọng số ưu tiên</label>
              <input type="number" min={1} className="qp-input" value={form.weight} onChange={(e) => set("weight", Number(e.target.value))} />
            </div>
          </div>
          <div className="qp-form-group">
            <label className="qp-label">Mô tả chi tiết (tuỳ chọn — hiển thị ở trang chi tiết quảng cáo)</label>
            <textarea className="qp-input" rows={4} value={form.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} placeholder="Giới thiệu sản phẩm/dịch vụ, ưu đãi, địa chỉ cửa hàng…" />
          </div>
          <div className="qp-form-group">
            <label className="qp-label">Ảnh quảng cáo (desktop) <span className="req">*</span></label>
            <ImageUploader value={form.imageDesktop ? [form.imageDesktop] : []} onChange={(arr) => set("imageDesktop", arr[0] ?? "")} max={1} />
          </div>
          <div className="qp-form-group">
            <label className="qp-label">Ảnh cho mobile (tuỳ chọn)</label>
            <ImageUploader value={form.imageMobile ? [form.imageMobile] : []} onChange={(arr) => set("imageMobile", arr[0] ?? "")} max={1} />
          </div>
          <div className="qp-acc-grid2">
            <div className="qp-form-group">
              <label className="qp-label">Từ ngày</label>
              <input type="date" className="qp-input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div className="qp-form-group">
              <label className="qp-label">Đến ngày</label>
              <input type="date" className="qp-input" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
          </div>
          <label className="qp-acc-pending-toggle" style={{ marginLeft: 0 }}>
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Đang chạy (hiển thị công khai)
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button type="submit" className="qp-btn-primary" disabled={busy}>{busy ? "Đang lưu…" : editingId ? "Lưu thay đổi" : "Thêm quảng cáo"}</button>
            <button type="button" className="qp-btn-outline" onClick={() => setShowForm(false)}>Huỷ</button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Chưa có quảng cáo nào</div><p className="type-body-small">Bấm “Thêm quảng cáo” để tạo banner đầu tiên.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Ảnh</th><th>Nhãn hàng</th><th>Vị trí</th><th>Xem</th><th>Click</th><th>CTR</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.imageDesktop} alt="" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 6 }} />
                  </td>
                  <td><b>{r.advertiser}</b><br /><span className="type-body-small text-muted">{r.title}</span></td>
                  <td>{placeLabel(r.placement)}</td>
                  <td>{r.impressions}</td>
                  <td>{r.clicks}</td>
                  <td>{r.impressions ? `${((r.clicks / r.impressions) * 100).toFixed(1)}%` : "—"}</td>
                  <td>
                    <button type="button" className={`qp-acc-badge is-${r.active ? "active" : "hidden"}`} style={{ border: 0, cursor: "pointer" }} onClick={() => toggleActive(r)}>
                      {r.active ? "Đang chạy" : "Tạm dừng"}
                    </button>
                  </td>
                  <td className="qp-admin-actions">
                    <RowActions actions={[
                      { value: "edit", label: "Sửa", run: () => startEdit(r) },
                      { value: "delete", label: "Xoá", run: () => remove(r) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
