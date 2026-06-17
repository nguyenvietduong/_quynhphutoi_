"use client";

// Quản trị Di tích: bảng + lọc + form thêm/sửa (modal) + xoá. Mẫu theo SchoolsManager + ImageUploader.
import { useMemo, useState } from "react";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import { WARDS } from "@/lib/wards";
import { ImageUploader } from "@/components/common/ImageUploader";
import { SeoFieldsEditor } from "@/components/admin/SeoFieldsEditor";
import type { SeoFields } from "@/lib/seo-fields";
import type { RelicRow } from "@/lib/relics";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { useToast } from "@/components/common/Toast";

type CatOption = { slug: string; name: string };
const wardName = (s: string) => WARDS.find((w) => w.slug === s)?.name ?? s;

type Form = {
  slug: string; name: string; type: string; wardSlug: string; ranking: string;
  recognizedYear: string; era: string; worship: string; festival: string;
  address: string; description: string; images: string[];
  verified: boolean; featured: boolean; active: boolean; seo?: SeoFields;
};
const emptyForm = (defaultType: string): Form => ({
  slug: "", name: "", type: defaultType, wardSlug: WARDS[0]?.slug ?? "", ranking: "",
  recognizedYear: "", era: "", worship: "", festival: "",
  address: "", description: "", images: [],
  verified: false, featured: false, active: true, seo: undefined,
});
const toForm = (r: RelicRow): Form => ({
  slug: r.slug, name: r.name, type: r.type, wardSlug: r.wardSlug, ranking: r.ranking ?? "",
  recognizedYear: r.recognizedYear ? String(r.recognizedYear) : "", era: r.era ?? "",
  worship: r.worship ?? "", festival: r.festival ?? "", address: r.address ?? "",
  description: r.description ?? "", images: r.images ?? [],
  verified: r.verified ?? false, featured: r.featured ?? false, active: r.active ?? true, seo: r.seo,
});

export function RelicsManager({ initial, typeOptions, rankingOptions }: {
  initial: RelicRow[];
  typeOptions: CatOption[];
  rankingOptions: CatOption[];
}) {
  const defaultType = typeOptions[0]?.slug ?? "";
  const typeLabel = (s: string) => typeOptions.find((x) => x.slug === s)?.name ?? s;
  const rankingLabel = (s: string) => rankingOptions.find((x) => x.slug === s)?.name ?? s;
  const [rows, setRows] = useState<RelicRow[]>(initial);
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");
  const [form, setForm] = useState<Form>(() => emptyForm(defaultType));
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
      (!kw || r.name.toLowerCase().includes(kw) || wardName(r.wardSlug).toLowerCase().includes(kw)));
  }, [rows, q, fType]);

  const pg = usePagination(filtered, 20);

  function startNew() { setForm(emptyForm(defaultType)); setEditing(null); setShow(true); }
  function startEdit(r: RelicRow) { setForm(toForm(r)); setEditing(r.slug); setShow(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nhập tên di tích."); return; }
    setBusy(true);
    try {
      const body = {
        name: form.name, type: form.type, wardSlug: form.wardSlug,
        ranking: form.ranking || undefined,
        recognizedYear: form.recognizedYear ? Number(form.recognizedYear) : undefined,
        era: form.era, worship: form.worship, festival: form.festival,
        address: form.address, description: form.description, images: form.images,
        verified: form.verified, featured: form.featured, active: form.active,
        seo: form.seo ?? {},
      };
      const res = await fetch(editing ? `/api/admin/di-tich/${editing}` : "/api/admin/di-tich", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      if (editing) {
        setRows((cur) => cur.map((r) => (r.slug === editing ? ({ ...r, ...body } as unknown as RelicRow) : r)));
      } else if (data.item) {
        setRows((cur) => [data.item as RelicRow, ...cur]);
      }
      setShow(false);
      toast.success(editing ? "Đã cập nhật." : "Đã thêm di tích mới.");
    } finally { setBusy(false); }
  }

  async function remove(r: RelicRow) {
    if (!confirm(`Xoá "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/di-tich/${r.slug}`, { method: "DELETE" });
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
        <button type="button" className="qp-btn-primary" onClick={startNew}>+ Thêm di tích</button>
      </div>

      {show && (
        <div className="qp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShow(false); }}>
          <form className="qp-modal qp-admin-modal" onSubmit={submit}>
            <div className="qp-modal__head">
              <b>{editing ? "Sửa di tích" : "Thêm di tích"}</b>
              <button type="button" className="qp-icon-btn" aria-label="Đóng" onClick={() => setShow(false)}>✕</button>
            </div>
            <div className="qp-modal__body" style={{ padding: "var(--space-5)" }}>
              <div className="qp-form-group">
                <label className="qp-label">Tên di tích <span className="req">*</span></label>
                <input className="qp-input" value={form.name} maxLength={160} onChange={(e) => set("name", e.target.value)} placeholder="VD: Đền A Sào" />
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Loại <span className="req">*</span></label>
                  <select className="qp-select" value={form.type} onChange={(e) => set("type", e.target.value)}>
                    {typeOptions.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                  </select></div>
                <div className="qp-form-group"><label className="qp-label">Xã / Thị trấn <span className="req">*</span></label>
                  <select className="qp-select" value={form.wardSlug} onChange={(e) => set("wardSlug", e.target.value)}>
                    {WARDS.map((w) => <option key={w.slug} value={w.slug}>{w.name}</option>)}
                  </select></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Xếp hạng</label>
                  <select className="qp-select" value={form.ranking} onChange={(e) => set("ranking", e.target.value)}>
                    <option value="">— Chưa xếp hạng —</option>
                    {rankingOptions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                  </select></div>
                <div className="qp-form-group"><label className="qp-label">Năm xếp hạng</label>
                  <input type="number" className="qp-input" value={form.recognizedYear} onChange={(e) => set("recognizedYear", e.target.value)} /></div>
              </div>
              <div className="qp-form-group"><label className="qp-label">Niên đại</label>
                <input className="qp-input" value={form.era} onChange={(e) => set("era", e.target.value)} placeholder="VD: Thời Trần (TK XIII)" /></div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Thờ ai / Sự tích</label>
                  <input className="qp-input" value={form.worship} onChange={(e) => set("worship", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Lễ hội</label>
                  <input className="qp-input" value={form.festival} onChange={(e) => set("festival", e.target.value)} /></div>
              </div>
              <div className="qp-form-group"><label className="qp-label">Địa chỉ</label>
                <input className="qp-input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Thôn/xóm, đường…" /></div>
              <div className="qp-form-group"><label className="qp-label">Mô tả</label>
                <textarea className="qp-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
              <div className="qp-form-group"><label className="qp-label">Hình ảnh</label>
                <ImageUploader value={form.images} onChange={(arr) => set("images", arr)} max={6} /></div>
              <SeoFieldsEditor value={form.seo} onChange={(seo) => set("seo", seo)} />
              <div style={{ display: "flex", gap: 20 }}>
                <label className="qp-check"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Đã xác minh</label>
                <label className="qp-check"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Nổi bật</label>
                <label className="qp-check"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Hiển thị công khai</label>
              </div>
            </div>
            <div className="qp-modal__foot">
              <button type="button" className="qp-btn-outline" onClick={() => setShow(false)}>Huỷ</button>
              <button type="submit" className="qp-btn-primary" disabled={busy}>{busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm di tích"}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không có di tích nào</div><p className="type-body-small">Bấm “Thêm di tích” để tạo mới.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Tên</th><th>Loại</th><th>Xếp hạng</th><th>Xã/TT</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td><b className="qp-clip" title={r.name}>{r.name}</b></td>
                  <td>{typeLabel(r.type)}</td>
                  <td>{r.ranking ? rankingLabel(r.ranking) : "—"}</td>
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
