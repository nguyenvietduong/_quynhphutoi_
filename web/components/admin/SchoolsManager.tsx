"use client";

// Quản trị Trường học: bảng + lọc + form thêm/sửa (modal) + xoá. Mẫu cho các module content khác.
import { useMemo, useState } from "react";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import { WARDS } from "@/lib/wards";
import type { SchoolRow } from "@/lib/schools";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { SeoFieldsEditor } from "@/components/admin/SeoFieldsEditor";
import type { SeoFields } from "@/lib/seo-fields";
import { useToast } from "@/components/common/Toast";

const LEVELS = [
  { slug: "mam-non", label: "Mầm non" },
  { slug: "tieu-hoc", label: "Tiểu học" },
  { slug: "thcs", label: "Trung học cơ sở" },
  { slug: "thpt", label: "Trung học phổ thông" },
] as const;
const TYPES = [
  { slug: "cong-lap", label: "Công lập" },
  { slug: "tu-thuc", label: "Tư thục" },
  { slug: "dan-lap", label: "Dân lập" },
  { slug: "gdnn-gdtx", label: "GDNN–GDTX" },
] as const;
const levelLabel = (s: string) => LEVELS.find((x) => x.slug === s)?.label ?? s;
const typeLabel = (s: string) => TYPES.find((x) => x.slug === s)?.label ?? s;
const wardName = (s: string) => WARDS.find((w) => w.slug === s)?.name ?? s;

type Form = {
  slug: string; name: string; shortName: string; level: string; type: string; wardSlug: string;
  address: string; phone: string; email: string; website: string; principal: string;
  foundedYear: string; description: string; verified: boolean; active: boolean; seo?: SeoFields;
};
const EMPTY: Form = {
  slug: "", name: "", shortName: "", level: "thpt", type: "cong-lap", wardSlug: WARDS[0]?.slug ?? "",
  address: "", phone: "", email: "", website: "", principal: "", foundedYear: "", description: "",
  verified: false, active: true, seo: undefined,
};
const toForm = (r: SchoolRow): Form => ({
  slug: r.slug, name: r.name, shortName: r.shortName ?? "", level: r.level, type: r.type, wardSlug: r.wardSlug,
  address: r.address ?? "", phone: r.phone ?? "", email: r.email ?? "", website: r.website ?? "",
  principal: r.principal ?? "", foundedYear: r.foundedYear ? String(r.foundedYear) : "", description: r.description ?? "",
  verified: r.verified, active: r.active, seo: r.seo,
});

export function SchoolsManager({ initial }: { initial: SchoolRow[] }) {
  const [rows, setRows] = useState<SchoolRow[]>(initial);
  const [q, setQ] = useState("");
  const [fLevel, setFLevel] = useState("");
  const [form, setForm] = useState<Form>({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  useModalDismiss(show, () => setShow(false));
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  function set<K extends keyof Form>(k: K, v: Form[K]) { setForm((f) => ({ ...f, [k]: v })); }

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!fLevel || r.level === fLevel) &&
      (!kw || r.name.toLowerCase().includes(kw) || wardName(r.wardSlug).toLowerCase().includes(kw)));
  }, [rows, q, fLevel]);

  const pg = usePagination(filtered, 20);

  function startNew() { setForm({ ...EMPTY }); setEditing(null); setShow(true); }
  function startEdit(r: SchoolRow) { setForm(toForm(r)); setEditing(r.slug); setShow(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nhập tên trường."); return; }
    setBusy(true);
    try {
      const body = {
        name: form.name, shortName: form.shortName, level: form.level, type: form.type, wardSlug: form.wardSlug,
        address: form.address, phone: form.phone, email: form.email, website: form.website,
        principal: form.principal, foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
        description: form.description, verified: form.verified, active: form.active,
        seo: form.seo ?? {},
      };
      const res = await fetch(editing ? `/api/admin/truong-hoc/${editing}` : "/api/admin/truong-hoc", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      if (editing) {
        setRows((cur) => cur.map((r) => (r.slug === editing ? ({ ...r, ...body } as unknown as SchoolRow) : r)));
      } else if (data.item) {
        setRows((cur) => [data.item as SchoolRow, ...cur]);
      }
      setShow(false);
      toast.success(editing ? "Đã cập nhật." : "Đã thêm trường mới.");
    } finally { setBusy(false); }
  }

  async function remove(r: SchoolRow) {
    if (!confirm(`Xoá "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/truong-hoc/${r.slug}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.slug !== r.slug));
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-admin-toolbar">
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm theo tên / xã…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="qp-select" style={{ maxWidth: 200 }} value={fLevel} onChange={(e) => setFLevel(e.target.value)}>
          <option value="">Tất cả cấp học</option>
          {LEVELS.map((l) => <option key={l.slug} value={l.slug}>{l.label}</option>)}
        </select>
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        <button type="button" className="qp-btn-primary" onClick={startNew}>+ Thêm trường</button>
      </div>

      {show && (
        <div className="qp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShow(false); }}>
          <form className="qp-modal qp-admin-modal" onSubmit={submit}>
            <div className="qp-modal__head">
              <b>{editing ? "Sửa trường học" : "Thêm trường học"}</b>
              <button type="button" className="qp-icon-btn" aria-label="Đóng" onClick={() => setShow(false)}>✕</button>
            </div>
            <div className="qp-modal__body" style={{ padding: "var(--space-5)" }}>
              <div className="qp-form-group">
                <label className="qp-label">Tên trường <span className="req">*</span></label>
                <input className="qp-input" value={form.name} maxLength={160} onChange={(e) => set("name", e.target.value)} placeholder="VD: Trường THPT Quỳnh Côi" />
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Tên viết tắt</label>
                  <input className="qp-input" value={form.shortName} onChange={(e) => set("shortName", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Hiệu trưởng</label>
                  <input className="qp-input" value={form.principal} onChange={(e) => set("principal", e.target.value)} /></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Cấp học <span className="req">*</span></label>
                  <select className="qp-select" value={form.level} onChange={(e) => set("level", e.target.value)}>
                    {LEVELS.map((l) => <option key={l.slug} value={l.slug}>{l.label}</option>)}
                  </select></div>
                <div className="qp-form-group"><label className="qp-label">Loại hình <span className="req">*</span></label>
                  <select className="qp-select" value={form.type} onChange={(e) => set("type", e.target.value)}>
                    {TYPES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
                  </select></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Xã / Thị trấn <span className="req">*</span></label>
                  <select className="qp-select" value={form.wardSlug} onChange={(e) => set("wardSlug", e.target.value)}>
                    {WARDS.map((w) => <option key={w.slug} value={w.slug}>{w.name}</option>)}
                  </select></div>
                <div className="qp-form-group"><label className="qp-label">Năm thành lập</label>
                  <input type="number" className="qp-input" value={form.foundedYear} onChange={(e) => set("foundedYear", e.target.value)} /></div>
              </div>
              <div className="qp-form-group"><label className="qp-label">Địa chỉ</label>
                <input className="qp-input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Thôn/xóm, đường…" /></div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Điện thoại</label>
                  <input className="qp-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Website</label>
                  <input className="qp-input" value={form.website} onChange={(e) => set("website", e.target.value)} /></div>
              </div>
              <div className="qp-form-group"><label className="qp-label">Email</label>
                <input className="qp-input" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
              <div className="qp-form-group"><label className="qp-label">Mô tả</label>
                <textarea className="qp-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
              <SeoFieldsEditor value={form.seo} onChange={(seo) => set("seo", seo)} />
              <div style={{ display: "flex", gap: 20 }}>
                <label className="qp-check"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Đã xác minh</label>
                <label className="qp-check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Hiển thị công khai</label>
              </div>
            </div>
            <div className="qp-modal__foot">
              <button type="button" className="qp-btn-outline" onClick={() => setShow(false)}>Huỷ</button>
              <button type="submit" className="qp-btn-primary" disabled={busy}>{busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm trường"}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không có trường nào</div><p className="type-body-small">Bấm “Thêm trường” để tạo mới.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Tên trường</th><th>Cấp</th><th>Loại</th><th>Xã/TT</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td><b>{r.name}</b>{r.principal ? <><br /><span className="type-body-small text-muted">HT: {r.principal}</span></> : null}</td>
                  <td>{levelLabel(r.level)}</td>
                  <td>{typeLabel(r.type)}</td>
                  <td>{wardName(r.wardSlug)}</td>
                  <td><span className={`qp-acc-badge is-${r.active ? "active" : "hidden"}`}>{r.active ? "Hiện" : "Ẩn"}</span></td>
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
          <Pagination page={pg.page} totalPages={pg.totalPages} onPage={pg.setPage} />
        </div>
      )}
    </div>
  );
}
