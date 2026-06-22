"use client";

// Quản trị Giao thông: bảng + lọc + form thêm/sửa (modal) + xoá. Mẫu theo SchoolsManager.
import { useMemo, useState } from "react";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import type { TransitRow } from "@/lib/transit";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { hasPerm, type PermLevel } from "@/lib/perm";
import { SeoFieldsEditor } from "@/components/admin/SeoFieldsEditor";
import type { SeoFields } from "@/lib/seo-fields";
import { useToast } from "@/components/common/Toast";

type TypeOption = { slug: string; name: string };

type Form = {
  slug: string; name: string; type: string; origin: string; destination: string; stops: string;
  operator: string; phone: string; fare: string; frequency: string; duration: string; distance: string;
  note: string; verified: boolean; active: boolean; seo?: SeoFields;
};
const EMPTY: Form = {
  slug: "", name: "", type: "", origin: "", destination: "", stops: "",
  operator: "", phone: "", fare: "", frequency: "", duration: "", distance: "",
  note: "", verified: false, active: true, seo: undefined,
};
const toForm = (r: TransitRow): Form => ({
  slug: r.slug, name: r.name, type: r.type, origin: r.origin, destination: r.destination,
  stops: (r.stops ?? []).join("\n"),
  operator: r.operator ?? "", phone: r.phone ?? "", fare: r.fare ?? "", frequency: r.frequency ?? "",
  duration: r.duration ?? "", distance: r.distance ?? "", note: r.note ?? "",
  verified: r.verified ?? false, active: r.active ?? true, seo: r.seo,
});

export function TransitManager({ initial, typeOptions, perm = "full" }: { initial: TransitRow[]; typeOptions: TypeOption[]; perm?: PermLevel }) {
  const canEdit = hasPerm(perm, "edit");
  const typeLabel = (s: string) => typeOptions.find((x) => x.slug === s)?.name ?? s;
  const [rows, setRows] = useState<TransitRow[]>(initial);
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");
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
      (!fType || r.type === fType) &&
      (!kw || r.name.toLowerCase().includes(kw) || r.origin.toLowerCase().includes(kw) || r.destination.toLowerCase().includes(kw)));
  }, [rows, q, fType]);

  const pg = usePagination(filtered, 20);

  function startNew() { setForm({ ...EMPTY, type: typeOptions[0]?.slug ?? "" }); setEditing(null); setShow(true); }
  function startEdit(r: TransitRow) { setForm(toForm(r)); setEditing(r.slug); setShow(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nhập tên tuyến."); return; }
    setBusy(true);
    try {
      const body = {
        name: form.name, type: form.type, origin: form.origin, destination: form.destination,
        stops: form.stops.split("\n").map((s) => s.trim()).filter(Boolean),
        operator: form.operator, phone: form.phone, fare: form.fare, frequency: form.frequency,
        duration: form.duration, distance: form.distance, note: form.note,
        verified: form.verified, active: form.active,
        seo: form.seo ?? {},
      };
      const res = await fetch(editing ? `/api/admin/giao-thong/${editing}` : "/api/admin/giao-thong", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      if (editing) {
        setRows((cur) => cur.map((r) => (r.slug === editing ? ({ ...r, ...body } as unknown as TransitRow) : r)));
      } else if (data.item) {
        setRows((cur) => [data.item as TransitRow, ...cur]);
      }
      setShow(false);
      toast.success(editing ? "Đã cập nhật." : "Đã thêm tuyến mới.");
    } finally { setBusy(false); }
  }

  async function remove(r: TransitRow) {
    if (!confirm(`Xoá "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/giao-thong/${r.slug}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.slug !== r.slug));
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-admin-toolbar">
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm theo tên / điểm đầu / điểm cuối…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="qp-select" style={{ maxWidth: 200 }} value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">Tất cả loại tuyến</option>
          {typeOptions.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
        </select>
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        {canEdit && <button type="button" className="qp-btn-primary" onClick={startNew}>+ Thêm tuyến</button>}
      </div>

      {show && (
        <div className="qp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShow(false); }}>
          <form className="qp-modal qp-admin-modal" onSubmit={submit}>
            <div className="qp-modal__head">
              <b>{editing ? "Sửa tuyến giao thông" : "Thêm tuyến giao thông"}</b>
              <button type="button" className="qp-icon-btn" aria-label="Đóng" onClick={() => setShow(false)}>✕</button>
            </div>
            <div className="qp-modal__body" style={{ padding: "var(--space-5)" }}>
              <div className="qp-form-group">
                <label className="qp-label">Tên tuyến <span className="req">*</span></label>
                <input className="qp-input" value={form.name} maxLength={160} onChange={(e) => set("name", e.target.value)} placeholder="VD: Quỳnh Côi – Hà Nội" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label">Loại tuyến <span className="req">*</span></label>
                <select className="qp-select" value={form.type} onChange={(e) => set("type", e.target.value)}>
                  {typeOptions.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                </select>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Điểm đầu <span className="req">*</span></label>
                  <input className="qp-input" value={form.origin} onChange={(e) => set("origin", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Điểm cuối <span className="req">*</span></label>
                  <input className="qp-input" value={form.destination} onChange={(e) => set("destination", e.target.value)} /></div>
              </div>
              <div className="qp-form-group"><label className="qp-label">Điểm dừng / lộ trình</label>
                <textarea className="qp-textarea" value={form.stops} onChange={(e) => set("stops", e.target.value)} placeholder="Mỗi điểm dừng một dòng" /></div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Nhà xe</label>
                  <input className="qp-input" value={form.operator} onChange={(e) => set("operator", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Điện thoại</label>
                  <input className="qp-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Giá vé</label>
                  <input className="qp-input" value={form.fare} onChange={(e) => set("fare", e.target.value)} placeholder="VD: 70.000đ" /></div>
                <div className="qp-form-group"><label className="qp-label">Tần suất</label>
                  <input className="qp-input" value={form.frequency} onChange={(e) => set("frequency", e.target.value)} placeholder="VD: 30 phút/chuyến" /></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Thời gian</label>
                  <input className="qp-input" value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="VD: 2 giờ" /></div>
                <div className="qp-form-group"><label className="qp-label">Quãng đường</label>
                  <input className="qp-input" value={form.distance} onChange={(e) => set("distance", e.target.value)} placeholder="VD: 110 km" /></div>
              </div>
              <div className="qp-form-group"><label className="qp-label">Lưu ý</label>
                <textarea className="qp-textarea" value={form.note} onChange={(e) => set("note", e.target.value)} /></div>
              <SeoFieldsEditor value={form.seo} onChange={(seo) => set("seo", seo)} />
              <div style={{ display: "flex", gap: 20 }}>
                <label className="qp-check"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Đã xác minh</label>
                <label className="qp-check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Hiển thị công khai</label>
              </div>
            </div>
            <div className="qp-modal__foot">
              <button type="button" className="qp-btn-outline" onClick={() => setShow(false)}>Huỷ</button>
              <button type="submit" className="qp-btn-primary" disabled={busy}>{busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm tuyến"}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không có tuyến nào</div><p className="type-body-small">Bấm “Thêm tuyến” để tạo mới.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Tên</th><th>Loại</th><th>Lộ trình</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td><b className="qp-clip" title={r.name}>{r.name}</b>{r.operator ? <span className="qp-clip--sm type-body-small text-muted">{r.operator}</span> : null}</td>
                  <td>{typeLabel(r.type)}</td>
                  <td>{r.origin} → {r.destination}</td>
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
