"use client";

// Quản trị Chợ & Mua bán: bảng + lọc + form thêm/sửa (modal) + xoá. Mẫu theo SchoolsManager.
import { useMemo, useState } from "react";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import { WARDS } from "@/lib/wards";
import type { MarketRow } from "@/lib/market";
import { SeoFieldsEditor } from "@/components/admin/SeoFieldsEditor";
import type { SeoFields } from "@/lib/seo-fields";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { hasPerm, type PermLevel } from "@/lib/perm";
import { useToast } from "@/components/common/Toast";
import { ImageUploader } from "@/components/common/ImageUploader";

export type CategoryOption = { slug: string; name: string };
const wardName = (s: string) => WARDS.find((w) => w.slug === s)?.name ?? s;

type Form = {
  slug: string; name: string; category: string; wardSlug: string;
  schedule: string; priceText: string; unit: string; contactName: string; contactPhone: string;
  address: string; description: string; image: string; verified: boolean; featured: boolean; active: boolean;
  seo?: SeoFields;
};
const EMPTY: Form = {
  slug: "", name: "", category: "", wardSlug: WARDS[0]?.slug ?? "",
  schedule: "", priceText: "", unit: "", contactName: "", contactPhone: "",
  address: "", description: "", image: "", verified: false, featured: false, active: true,
  seo: undefined,
};
const toForm = (r: MarketRow): Form => ({
  slug: r.slug, name: r.name, category: r.category, wardSlug: r.wardSlug,
  schedule: r.schedule ?? "", priceText: r.priceText ?? "", unit: r.unit ?? "",
  contactName: r.contactName ?? "", contactPhone: r.contactPhone ?? "",
  address: r.address ?? "", description: r.description ?? "", image: r.image ?? "",
  verified: r.verified ?? false, featured: r.featured ?? false, active: r.active ?? true,
  seo: r.seo,
});

export function MarketManager({ initial, categoryOptions, perm = "full" }: { initial: MarketRow[]; categoryOptions: CategoryOption[]; perm?: PermLevel }) {
  const canEdit = hasPerm(perm, "edit");
  const [rows, setRows] = useState<MarketRow[]>(initial);
  const [q, setQ] = useState("");
  const [fCategory, setFCategory] = useState("");
  const categoryName = (s: string) => categoryOptions.find((c) => c.slug === s)?.name ?? s;
  const defaultCategory = categoryOptions[0]?.slug ?? "";
  const [form, setForm] = useState<Form>({ ...EMPTY, category: defaultCategory });
  const [editing, setEditing] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  useModalDismiss(show, () => setShow(false));
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  function set<K extends keyof Form>(k: K, v: Form[K]) { setForm((f) => ({ ...f, [k]: v })); }

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!fCategory || r.category === fCategory) &&
      (!kw || r.name.toLowerCase().includes(kw) || wardName(r.wardSlug).toLowerCase().includes(kw)));
  }, [rows, q, fCategory]);

  const pg = usePagination(filtered, 20);

  function startNew() { setForm({ ...EMPTY, category: defaultCategory }); setEditing(null); setShow(true); }
  function startEdit(r: MarketRow) { setForm(toForm(r)); setEditing(r.slug); setShow(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nhập tên."); return; }
    setBusy(true);
    try {
      const body = {
        name: form.name, category: form.category, wardSlug: form.wardSlug,
        schedule: form.schedule, priceText: form.priceText, unit: form.unit,
        contactName: form.contactName, contactPhone: form.contactPhone,
        address: form.address, description: form.description, image: form.image || undefined,
        seo: form.seo ?? {},
        verified: form.verified, featured: form.featured, active: form.active,
      };
      const res = await fetch(editing ? `/api/admin/cho/${editing}` : "/api/admin/cho", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      if (editing) {
        setRows((cur) => cur.map((r) => (r.slug === editing ? ({ ...r, ...body } as unknown as MarketRow) : r)));
      } else if (data.item) {
        setRows((cur) => [data.item as MarketRow, ...cur]);
      }
      setShow(false);
      toast.success(editing ? "Đã cập nhật." : "Đã thêm mục mới.");
    } finally { setBusy(false); }
  }

  async function remove(r: MarketRow) {
    if (!confirm(`Xoá "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/cho/${r.slug}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.slug !== r.slug));
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-admin-toolbar">
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm theo tên / xã…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="qp-select" style={{ maxWidth: 200 }} value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
          <option value="">Tất cả danh mục</option>
          {categoryOptions.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        {canEdit && <button type="button" className="qp-btn-primary" onClick={startNew}>+ Thêm mục</button>}
      </div>

      {show && (
        <div className="qp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShow(false); }}>
          <form className="qp-modal qp-admin-modal" onSubmit={submit}>
            <div className="qp-modal__head">
              <b>{editing ? "Sửa mục Chợ & Mua bán" : "Thêm mục Chợ & Mua bán"}</b>
              <button type="button" className="qp-icon-btn" aria-label="Đóng" onClick={() => setShow(false)}>✕</button>
            </div>
            <div className="qp-modal__body" style={{ padding: "var(--space-5)" }}>
              <div className="qp-form-group">
                <label className="qp-label">Tên <span className="req">*</span></label>
                <input className="qp-input" value={form.name} maxLength={160} onChange={(e) => set("name", e.target.value)} placeholder="VD: Chợ Quỳnh Côi" />
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Danh mục <span className="req">*</span></label>
                  <select className="qp-select" value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {categoryOptions.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select></div>
                <div className="qp-form-group"><label className="qp-label">Xã / Thị trấn <span className="req">*</span></label>
                  <select className="qp-select" value={form.wardSlug} onChange={(e) => set("wardSlug", e.target.value)}>
                    {WARDS.map((w) => <option key={w.slug} value={w.slug}>{w.name}</option>)}
                  </select></div>
              </div>
              <div className="qp-form-group"><label className="qp-label">Lịch họp</label>
                <input className="qp-input" value={form.schedule} onChange={(e) => set("schedule", e.target.value)} placeholder="VD: Phiên các ngày 1,6 âm lịch" /></div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Giá tham khảo</label>
                  <input className="qp-input" value={form.priceText} onChange={(e) => set("priceText", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Đơn vị</label>
                  <input className="qp-input" value={form.unit} onChange={(e) => set("unit", e.target.value)} /></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Người liên hệ</label>
                  <input className="qp-input" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Điện thoại</label>
                  <input className="qp-input" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} /></div>
              </div>
              <div className="qp-form-group"><label className="qp-label">Địa chỉ</label>
                <input className="qp-input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Thôn/xóm, đường…" /></div>
              <div className="qp-form-group"><label className="qp-label">Ảnh</label>
                <ImageUploader max={1} value={form.image ? [form.image] : []} onChange={(urls) => set("image", urls[0] ?? "")} /></div>
              <div className="qp-form-group"><label className="qp-label">Mô tả</label>
                <textarea className="qp-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
              <SeoFieldsEditor value={form.seo} onChange={(seo) => set("seo", seo)} />
              <div style={{ display: "flex", gap: 20 }}>
                <label className="qp-check"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Đã xác minh</label>
                <label className="qp-check"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Nổi bật</label>
                <label className="qp-check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Hiển thị công khai</label>
              </div>
            </div>
            <div className="qp-modal__foot">
              <button type="button" className="qp-btn-outline" onClick={() => setShow(false)}>Huỷ</button>
              <button type="submit" className="qp-btn-primary" disabled={busy}>{busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm mục"}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không có mục nào</div><p className="type-body-small">Bấm “Thêm mục” để tạo mới.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Tên</th><th>Danh mục</th><th>Xã/TT</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td><b className="qp-clip" title={r.name}>{r.name}</b>{r.contactName ? <span className="qp-clip--sm type-body-small text-muted">LH: {r.contactName}</span> : null}</td>
                  <td>{categoryName(r.category)}</td>
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
