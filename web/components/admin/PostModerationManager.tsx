"use client";

// Quản lý toàn bộ tin do người dùng đăng (việc làm / tìm đồ rơi / mua bán):
// thống kê, lọc trạng thái duyệt, xem chi tiết đầy đủ, duyệt/bỏ duyệt, sửa, xoá. Dùng chung 3 phân hệ.
import { useMemo, useState } from "react";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import { TimeAgo } from "@/components/common/TimeAgo";
import { formatDateTime } from "@/lib/datetime";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { RichTextEditor } from "@/components/lostfound/RichTextEditor";
import { ImageUploader } from "@/components/common/ImageUploader";
import { SeoFieldsEditor } from "@/components/admin/SeoFieldsEditor";
import type { SeoFields } from "@/lib/seo-fields";
import { useToast } from "@/components/common/Toast";

export type ModRow = {
  slug: string; title: string; sub: string; description: string;
  extra: string; status: string; approved: boolean; featured: boolean;
  postedByName: string; createdAt: string;
  images?: string[]; thumb?: string;
  address?: string; mapUrl?: string;             // vị trí (sửa được như form client)
  seo?: SeoFields;                               // ghi đè SEO trang chi tiết (tuỳ chọn)
  specs?: { label: string; value: string }[];   // thông số chi tiết hiển thị ở modal
};

export type ModConfig = {
  apiBase: string;        // /api/admin/jobs
  publicBase: string;     // /viec-lam
  extraKey: "company" | "priceText" | "reward" | null;
  extraLabel: string;
  statusOptions: { value: string; label: string }[];
};

export function PostModerationManager({ initial, config }: { initial: ModRow[]; config: ModConfig }) {
  const [rows, setRows] = useState<ModRow[]>(initial);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"pending" | "approved" | "all">("pending");
  const [edit, setEdit] = useState<ModRow | null>(null);
  const [detail, setDetail] = useState<ModRow | null>(null);
  useModalDismiss(!!edit, () => setEdit(null));
  useModalDismiss(!!detail, () => setDetail(null));
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const statusLabel = (s: string) => config.statusOptions.find((o) => o.value === s)?.label ?? s;

  const counts = useMemo(() => ({
    pending: rows.filter((r) => !r.approved).length,
    approved: rows.filter((r) => r.approved).length,
    all: rows.length,
  }), [rows]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) =>
      (view === "all" || (view === "pending" ? !r.approved : r.approved)) &&
      (!kw || r.title.toLowerCase().includes(kw) || r.sub.toLowerCase().includes(kw) || r.postedByName.toLowerCase().includes(kw)));
  }, [rows, q, view]);

  const pg = usePagination(filtered, 20);

  async function approve(r: ModRow, approved: boolean) {
    setRows((cur) => cur.map((x) => (x.slug === r.slug ? { ...x, approved } : x)));
    const res = await fetch(`${config.apiBase}/${r.slug}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved }),
    });
    if (!res.ok) { setRows((cur) => cur.map((x) => (x.slug === r.slug ? { ...x, approved: !approved } : x))); toast.error("Không cập nhật được."); }
    else toast.success(approved ? "Đã duyệt tin." : "Đã bỏ duyệt.");
  }

  async function remove(r: ModRow) {
    if (!confirm(`Xoá tin "${r.title}"? Người đăng sẽ nhận thông báo từ chối.`)) return;
    const res = await fetch(`${config.apiBase}/${r.slug}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.slug !== r.slug));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        title: edit.title, description: edit.description, featured: edit.featured,
        status: edit.status, approved: edit.approved,
        images: edit.images ?? [], address: edit.address ?? "", mapUrl: edit.mapUrl ?? "",
        seo: edit.seo ?? {},
      };
      if (config.extraKey) body[config.extraKey] = edit.extra;
      const res = await fetch(`${config.apiBase}/${edit.slug}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Không lưu được."); return; }
      setRows((cur) => cur.map((x) => (x.slug === edit.slug ? { ...edit, thumb: edit.images?.[0] } : x)));
      setEdit(null);
      toast.success("Đã lưu thay đổi.");
    } finally { setBusy(false); }
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-admin-statline">
        <div className="qp-admin-statline__item"><span className={`qp-admin-statline__num${counts.pending ? " is-warn" : ""}`}>{counts.pending}</span><span className="qp-admin-statline__lbl">Chờ duyệt</span></div>
        <div className="qp-admin-statline__item"><span className="qp-admin-statline__num">{counts.approved}</span><span className="qp-admin-statline__lbl">Đã duyệt</span></div>
        <div className="qp-admin-statline__item"><span className="qp-admin-statline__num">{counts.all}</span><span className="qp-admin-statline__lbl">Tổng tin</span></div>
      </div>

      <div className="qp-tabs" style={{ marginBottom: "var(--space-4)" }}>
        {(["pending", "approved", "all"] as const).map((v) => (
          <button key={v} type="button" className={`qp-tab${view === v ? " is-active" : ""}`} onClick={() => setView(v)}>
            {v === "pending" ? "Chờ duyệt" : v === "approved" ? "Đã duyệt" : "Tất cả"}
            <span className="qp-tab__count">{counts[v]}</span>
          </button>
        ))}
      </div>
      <div className="qp-admin-toolbar">
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm theo tiêu đề / người đăng…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
      </div>

      {edit && (
        <div className="qp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEdit(null); }}>
          <form className="qp-modal qp-admin-modal" onSubmit={saveEdit}>
            <div className="qp-modal__head">
              <b>Sửa tin</b>
              <button type="button" className="qp-icon-btn" aria-label="Đóng" onClick={() => setEdit(null)}>✕</button>
            </div>
            <div className="qp-modal__body qp-editform" style={{ padding: "var(--space-5)" }}>
              <div className="qp-admin-section-title" style={{ marginTop: 0 }}>Nội dung</div>
              <div className={config.extraKey ? "qp-acc-grid2" : undefined}>
                <div className="qp-form-group"><label className="qp-label">Tiêu đề</label>
                  <input className="qp-input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
                {config.extraKey && (
                  <div className="qp-form-group"><label className="qp-label">{config.extraLabel}</label>
                    <input className="qp-input" value={edit.extra} onChange={(e) => setEdit({ ...edit, extra: e.target.value })} /></div>
                )}
              </div>
              <div className="qp-form-group"><label className="qp-label">Mô tả</label>
                <RichTextEditor value={edit.description} onChange={(html) => setEdit((cur) => (cur ? { ...cur, description: html } : cur))} placeholder="Nội dung tin…" /></div>

              <div className="qp-admin-section-title">Hình ảnh &amp; vị trí</div>
              <div className="qp-form-group"><label className="qp-label">Hình ảnh</label>
                <ImageUploader value={edit.images ?? []} onChange={(urls) => setEdit((cur) => (cur ? { ...cur, images: urls } : cur))} max={8} /></div>
              <div className="qp-form-group"><label className="qp-label">Địa chỉ cụ thể</label>
                <input className="qp-input" maxLength={200} value={edit.address ?? ""} onChange={(e) => setEdit((cur) => (cur ? { ...cur, address: e.target.value } : cur))} placeholder="VD: Thôn …, gần chợ …" /></div>
              <div className="qp-form-group"><label className="qp-label">Link Google Maps</label>
                <input type="url" inputMode="url" className="qp-input" maxLength={500} value={edit.mapUrl ?? ""} onChange={(e) => setEdit((cur) => (cur ? { ...cur, mapUrl: e.target.value } : cur))} placeholder="Dán link Google Maps (nút Chia sẻ)" />
                <p className="qp-form-tip">Mở Google Maps → chọn vị trí → Chia sẻ → copy link dán vào đây.</p></div>

              <div className="qp-admin-section-title">Trạng thái &amp; hiển thị</div>
              <div className="qp-form-group"><label className="qp-label">Trạng thái tin</label>
                <select className="qp-select" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  {config.statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div className="qp-toggle-card">
                <label className="qp-switch-row">
                  <span className="qp-switch-row__text"><b>Đã duyệt</b><small>Hiển thị công khai cho mọi người</small></span>
                  <span className="qp-switch">
                    <input type="checkbox" checked={edit.approved} onChange={(e) => setEdit((cur) => (cur ? { ...cur, approved: e.target.checked } : cur))} />
                    <span className="qp-switch__track" />
                  </span>
                </label>
                <label className="qp-switch-row">
                  <span className="qp-switch-row__text"><b>Nổi bật</b><small>Ưu tiên hiển thị lên đầu danh sách</small></span>
                  <span className="qp-switch">
                    <input type="checkbox" checked={edit.featured} onChange={(e) => setEdit((cur) => (cur ? { ...cur, featured: e.target.checked } : cur))} />
                    <span className="qp-switch__track" />
                  </span>
                </label>
              </div>

              <div className="qp-admin-section-title">Tối ưu SEO</div>
              <SeoFieldsEditor value={edit.seo ?? undefined} onChange={(seo) => setEdit((cur) => (cur ? { ...cur, seo } : cur))} />
            </div>
            <div className="qp-modal__foot">
              <button type="button" className="qp-btn-outline" onClick={() => setEdit(null)}>Huỷ</button>
              <button type="submit" className="qp-btn-primary" disabled={busy}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div className="qp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="qp-modal qp-admin-modal" style={{ width: "min(820px, 100%)" }}>
            <div className="qp-modal__head">
              <b>Chi tiết tin</b>
              <button type="button" className="qp-icon-btn" aria-label="Đóng" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="qp-modal__body" style={{ padding: "var(--space-5)" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span className={`qp-acc-badge is-${detail.approved ? "active" : "pending"}`}>{detail.approved ? "Đã duyệt" : "Chờ duyệt"}</span>
                <span className="qp-acc-badge">{statusLabel(detail.status)}</span>
                {detail.featured && <span className="qp-badge-g4">Nổi bật</span>}
              </div>
              <h3 className="type-h3" style={{ margin: "0 0 4px" }}>{detail.title}</h3>
              <p className="type-body-small text-muted" style={{ margin: 0 }}>{detail.sub}</p>

              {detail.images && detail.images.length > 0 && (
                <>
                  <div className="qp-admin-section-title">Hình ảnh ({detail.images.length})</div>
                  <div className="qp-admin-detail__imgs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {detail.images.map((src, i) => <a key={i} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" /></a>)}
                  </div>
                </>
              )}

              <div className="qp-admin-section-title">Thông tin</div>
              <div className="qp-admin-spec">
                <div className="qp-admin-spec__k">Người đăng</div><div className="qp-admin-spec__v">{detail.postedByName || "—"}</div>
                <div className="qp-admin-spec__k">Ngày đăng</div><div className="qp-admin-spec__v">{formatDateTime(detail.createdAt)}</div>
                {(detail.specs ?? []).map((s, i) => (
                  <Fragmently key={i} k={s.label} v={s.value} />
                ))}
              </div>

              <div className="qp-admin-section-title">Nội dung</div>
              <div className="qp-prose" dangerouslySetInnerHTML={{ __html: detail.description || "<p><i>(Không có mô tả)</i></p>" }} />
            </div>
            <div className="qp-modal__foot" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8 }}>
                {detail.approved && <a className="qp-btn-outline" href={`${config.publicBase}/${detail.slug}`} target="_blank" rel="noreferrer">Xem công khai</a>}
                <button type="button" className="qp-btn-outline" onClick={() => { const d = detail; setDetail(null); if (d) setEdit(d); }}>Sửa</button>
                <button type="button" className="qp-btn-outline" style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }} onClick={() => { const d = detail; setDetail(null); if (d) remove(d); }}>Từ chối / Xoá</button>
              </div>
              {detail.approved
                ? <button type="button" className="qp-btn-outline" onClick={() => { const d = detail; setDetail(null); if (d) approve(d, false); }}>Bỏ duyệt</button>
                : <button type="button" className="qp-btn-primary" onClick={() => { const d = detail; setDetail(null); if (d) approve(d, true); }}>Duyệt &amp; hiển thị</button>}
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không có tin</div><p className="type-body-small">Không có tin nào ở mục này.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th style={{ width: 64 }}>Ảnh</th><th>Tin đăng</th><th>Người đăng</th><th>Đăng lúc</th><th>Trạng thái</th><th>Duyệt</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td>
                    {r.thumb
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img className="qp-admin-thumb" src={r.thumb} alt="" />
                      : <span className="qp-admin-thumb qp-admin-thumb--ph"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m3 16 5-5 4 4 3-3 6 6" /></svg></span>}
                  </td>
                  <td>
                    <button type="button" className="qp-admin-link-btn" style={{ fontWeight: 700, color: "var(--color-navy)" }} onClick={() => setDetail(r)}>{r.title}</button>
                    {r.featured && <> <span className="qp-badge-g4">Nổi bật</span></>}
                    <br /><span className="type-body-small text-muted">{r.sub}</span>
                  </td>
                  <td>{r.postedByName}</td>
                  <td className="type-body-small text-muted"><TimeAgo iso={r.createdAt} /></td>
                  <td><span className="qp-acc-badge">{statusLabel(r.status)}</span></td>
                  <td><span className={`qp-acc-badge is-${r.approved ? "active" : "pending"}`}>{r.approved ? "Đã duyệt" : "Chờ"}</span></td>
                  <td className="qp-admin-actions">
                    <RowActions actions={[
                      { value: "detail", label: "Chi tiết", run: () => setDetail(r) },
                      r.approved
                        ? { value: "unapprove", label: "Bỏ duyệt", run: () => approve(r, false) }
                        : { value: "approve", label: "Duyệt", run: () => approve(r, true) },
                      { value: "view", label: "Xem công khai", hidden: !r.approved, run: () => window.open(`${config.publicBase}/${r.slug}`, "_blank") },
                      { value: "edit", label: "Sửa", run: () => setEdit(r) },
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

// Cặp ô label/value trong bảng thông số.
function Fragmently({ k, v }: { k: string; v: string }) {
  return (
    <>
      <div className="qp-admin-spec__k">{k}</div>
      <div className="qp-admin-spec__v">{v || "—"}</div>
    </>
  );
}
