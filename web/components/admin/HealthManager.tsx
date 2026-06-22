"use client";

// Quản trị Y tế: bảng + lọc + form thêm/sửa (modal) + xoá. Mẫu theo SchoolsManager.
import { useMemo, useState } from "react";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import { WARDS } from "@/lib/wards";
import type { HealthRow } from "@/lib/health";
import type { SeoFields } from "@/lib/seo-fields";
import { SeoFieldsEditor } from "@/components/admin/SeoFieldsEditor";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { hasPerm, type PermLevel } from "@/lib/perm";
import { useToast } from "@/components/common/Toast";
import { ImageUploader } from "@/components/common/ImageUploader";

type Option = { slug: string; name: string };
const wardName = (s: string) => WARDS.find((w) => w.slug === s)?.name ?? s;

type Form = {
  slug: string; name: string; shortName: string; type: string; ownership: string; wardSlug: string;
  director: string; hours: string; beds: string; specialties: string;
  address: string; phone: string; email: string; website: string;
  foundedYear: string; description: string; image: string; emergency: boolean; verified: boolean; active: boolean;
  seo?: SeoFields;
};
const emptyForm = (typeOptions: Option[], ownershipOptions: Option[]): Form => ({
  slug: "", name: "", shortName: "",
  type: typeOptions[0]?.slug ?? "", ownership: ownershipOptions[0]?.slug ?? "", wardSlug: WARDS[0]?.slug ?? "",
  director: "", hours: "", beds: "", specialties: "",
  address: "", phone: "", email: "", website: "", foundedYear: "", description: "", image: "",
  emergency: false, verified: false, active: true, seo: {},
});
const toForm = (r: HealthRow): Form => ({
  slug: r.slug, name: r.name, shortName: r.shortName ?? "", type: r.type, ownership: r.ownership, wardSlug: r.wardSlug,
  director: r.director ?? "", hours: r.hours ?? "", beds: r.beds ? String(r.beds) : "", specialties: r.specialties ?? "",
  address: r.address ?? "", phone: r.phone ?? "", email: r.email ?? "", website: r.website ?? "",
  foundedYear: r.foundedYear ? String(r.foundedYear) : "", description: r.description ?? "", image: r.image ?? "",
  emergency: r.emergency ?? false, verified: r.verified, active: r.active, seo: r.seo ?? {},
});

export function HealthManager({ initial, typeOptions, ownershipOptions, perm = "full" }: {
  initial: HealthRow[];
  typeOptions: Option[];
  ownershipOptions: Option[];
  perm?: PermLevel;
}) {
  const canEdit = hasPerm(perm, "edit");
  const [rows, setRows] = useState<HealthRow[]>(initial);
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");
  const [form, setForm] = useState<Form>(() => emptyForm(typeOptions, ownershipOptions));
  const [editing, setEditing] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  useModalDismiss(show, () => setShow(false));
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const typeLabel = (s: string) => typeOptions.find((x) => x.slug === s)?.name ?? s;
  const ownershipLabel = (s: string) => ownershipOptions.find((x) => x.slug === s)?.name ?? s;

  function set<K extends keyof Form>(k: K, v: Form[K]) { setForm((f) => ({ ...f, [k]: v })); }

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!fType || r.type === fType) &&
      (!kw || r.name.toLowerCase().includes(kw) || wardName(r.wardSlug).toLowerCase().includes(kw)));
  }, [rows, q, fType]);

  const pg = usePagination(filtered, 20);

  function startNew() { setForm(emptyForm(typeOptions, ownershipOptions)); setEditing(null); setShow(true); }
  function startEdit(r: HealthRow) { setForm(toForm(r)); setEditing(r.slug); setShow(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nhập tên cơ sở."); return; }
    setBusy(true);
    try {
      const body = {
        name: form.name, shortName: form.shortName, type: form.type, ownership: form.ownership, wardSlug: form.wardSlug,
        director: form.director, hours: form.hours, beds: form.beds ? Number(form.beds) : undefined, specialties: form.specialties,
        address: form.address, phone: form.phone, email: form.email, website: form.website,
        foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
        description: form.description, image: form.image || undefined,
        emergency: form.emergency, verified: form.verified, active: form.active,
        seo: form.seo ?? {},
      };
      const res = await fetch(editing ? `/api/admin/y-te/${editing}` : "/api/admin/y-te", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      if (editing) {
        setRows((cur) => cur.map((r) => (r.slug === editing ? ({ ...r, ...body } as unknown as HealthRow) : r)));
      } else if (data.item) {
        setRows((cur) => [data.item as HealthRow, ...cur]);
      }
      setShow(false);
      toast.success(editing ? "Đã cập nhật." : "Đã thêm cơ sở mới.");
    } finally { setBusy(false); }
  }

  async function remove(r: HealthRow) {
    if (!confirm(`Xoá "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/y-te/${r.slug}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.slug !== r.slug));
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-admin-toolbar">
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm theo tên / xã…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="qp-select" style={{ maxWidth: 200 }} value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">Tất cả loại</option>
          {typeOptions.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
        </select>
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        {canEdit && <button type="button" className="qp-btn-primary" onClick={startNew}>+ Thêm cơ sở</button>}
      </div>

      {show && (
        <div className="qp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShow(false); }}>
          <form className="qp-modal qp-admin-modal" onSubmit={submit}>
            <div className="qp-modal__head">
              <b>{editing ? "Sửa cơ sở y tế" : "Thêm cơ sở y tế"}</b>
              <button type="button" className="qp-icon-btn" aria-label="Đóng" onClick={() => setShow(false)}>✕</button>
            </div>
            <div className="qp-modal__body" style={{ padding: "var(--space-5)" }}>
              <div className="qp-form-group">
                <label className="qp-label">Tên cơ sở <span className="req">*</span></label>
                <input className="qp-input" value={form.name} maxLength={160} onChange={(e) => set("name", e.target.value)} placeholder="VD: Bệnh viện Đa khoa Quỳnh Phụ" />
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Tên viết tắt</label>
                  <input className="qp-input" value={form.shortName} onChange={(e) => set("shortName", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Giám đốc / Trưởng trạm</label>
                  <input className="qp-input" value={form.director} onChange={(e) => set("director", e.target.value)} /></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Loại cơ sở <span className="req">*</span></label>
                  <select className="qp-select" value={form.type} onChange={(e) => set("type", e.target.value)}>
                    {typeOptions.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                  </select></div>
                <div className="qp-form-group"><label className="qp-label">Sở hữu <span className="req">*</span></label>
                  <select className="qp-select" value={form.ownership} onChange={(e) => set("ownership", e.target.value)}>
                    {ownershipOptions.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
                  </select></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Xã / Thị trấn <span className="req">*</span></label>
                  <select className="qp-select" value={form.wardSlug} onChange={(e) => set("wardSlug", e.target.value)}>
                    {WARDS.map((w) => <option key={w.slug} value={w.slug}>{w.name}</option>)}
                  </select></div>
                <div className="qp-form-group"><label className="qp-label">Giờ làm việc</label>
                  <input className="qp-input" value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="VD: 7:00–17:00" /></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Số giường</label>
                  <input type="number" className="qp-input" value={form.beds} onChange={(e) => set("beds", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Chuyên khoa</label>
                  <input className="qp-input" value={form.specialties} onChange={(e) => set("specialties", e.target.value)} /></div>
              </div>
              <div className="qp-form-group"><label className="qp-label">Địa chỉ</label>
                <input className="qp-input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Thôn/xóm, đường…" /></div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Điện thoại</label>
                  <input className="qp-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Website</label>
                  <input className="qp-input" value={form.website} onChange={(e) => set("website", e.target.value)} /></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Email</label>
                  <input className="qp-input" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Năm thành lập</label>
                  <input type="number" className="qp-input" value={form.foundedYear} onChange={(e) => set("foundedYear", e.target.value)} /></div>
              </div>
              <div className="qp-form-group"><label className="qp-label">Ảnh cơ sở</label>
                <ImageUploader max={1} value={form.image ? [form.image] : []} onChange={(urls) => set("image", urls[0] ?? "")} /></div>
              <div className="qp-form-group"><label className="qp-label">Mô tả</label>
                <textarea className="qp-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
              <SeoFieldsEditor value={form.seo} onChange={(seo) => set("seo", seo)} />
              <div style={{ display: "flex", gap: 20 }}>
                <label className="qp-check"><input type="checkbox" checked={form.emergency} onChange={(e) => set("emergency", e.target.checked)} /> Có cấp cứu 24/7</label>
                <label className="qp-check"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Đã xác minh</label>
                <label className="qp-check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Hiển thị công khai</label>
              </div>
            </div>
            <div className="qp-modal__foot">
              <button type="button" className="qp-btn-outline" onClick={() => setShow(false)}>Huỷ</button>
              <button type="submit" className="qp-btn-primary" disabled={busy}>{busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm cơ sở"}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không có cơ sở nào</div><p className="type-body-small">Bấm “Thêm cơ sở” để tạo mới.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Tên cơ sở</th><th>Loại</th><th>Sở hữu</th><th>Xã/TT</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td><b className="qp-clip" title={r.name}>{r.name}</b>{r.director ? <span className="qp-clip--sm type-body-small text-muted">GĐ: {r.director}</span> : null}</td>
                  <td>{typeLabel(r.type)}</td>
                  <td>{ownershipLabel(r.ownership)}</td>
                  <td>{wardName(r.wardSlug)}</td>
                  <td><span className={`qp-acc-badge is-${r.active ? "active" : "hidden"}`}>{r.active ? "Hiện" : "Ẩn"}</span></td>
                  <td className="qp-admin-actions">
                    <RowActions actions={[
                      { value: "edit", label: "Sửa", hidden: !canEdit, run: () => startEdit(r) },
                      { value: "delete", label: "Xoá", hidden: !canEdit, run: () => remove(r) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pg.page} totalPages={pg.totalPages} onPage={pg.setPage} />
        </div>
      )}
    </div>
  );
}
