"use client";

// Quản trị Tin tức: bảng + form thêm/sửa (soạn nội dung bằng RichTextEditor) + nháp/xuất bản + SEO.
import { useMemo, useState } from "react";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import { ImageUploader } from "@/components/common/ImageUploader";
import { RichTextEditor } from "@/components/lostfound/RichTextEditor";
import type { ArticleRow } from "@/lib/articles";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { ExternalNewsImport } from "@/components/admin/ExternalNewsImport";
import { useToast } from "@/components/common/Toast";

const CATEGORIES = ["Thông báo", "Đời sống", "Kinh tế", "Giáo dục"];

type Form = {
  slug: string; title: string; excerpt: string; category: string; tags: string;
  coverImage: string; coverAlt: string; authorName: string; authorTitle: string;
  bodyHtml: string; featured: boolean; status: "draft" | "published";
  seoMetaTitle: string; seoMetaDescription: string; seoKeywords: string; seoOgImage: string; seoNoindex: boolean;
};
const EMPTY: Form = {
  slug: "", title: "", excerpt: "", category: "Thông báo", tags: "", coverImage: "", coverAlt: "",
  authorName: "Ban biên tập", authorTitle: "", bodyHtml: "", featured: false, status: "draft",
  seoMetaTitle: "", seoMetaDescription: "", seoKeywords: "", seoOgImage: "", seoNoindex: false,
};
const toForm = (r: ArticleRow): Form => ({
  slug: r.slug, title: r.title, excerpt: r.excerpt, category: r.category, tags: (r.tags ?? []).join(", "),
  coverImage: r.coverImage, coverAlt: r.coverAlt, authorName: r.authorName, authorTitle: r.authorTitle,
  bodyHtml: r.bodyHtml, featured: r.featured, status: r.status,
  seoMetaTitle: r.seo.metaTitle ?? "", seoMetaDescription: r.seo.metaDescription ?? "",
  seoKeywords: (r.seo.keywords ?? []).join(", "), seoOgImage: r.seo.ogImage ?? "", seoNoindex: !!r.seo.noindex,
});

export function ArticleManager({ initial, externalEnabled }: { initial: ArticleRow[]; externalEnabled?: boolean }) {
  const [rows, setRows] = useState<ArticleRow[]>(initial);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
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
      (!fStatus || (fStatus === "pending" ? r.pending : (!r.pending && r.status === fStatus))) &&
      (!kw || r.title.toLowerCase().includes(kw)));
  }, [rows, q, fStatus]);

  async function approve(r: ArticleRow) {
    const res = await fetch(`/api/admin/articles/${r.slug}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved: true }),
    });
    if (res.ok) {
      setRows((cur) => cur.map((x) => (x.slug === r.slug ? { ...x, approved: true, pending: false, status: "published" } : x)));
      toast.success("Đã duyệt bài viết.");
    } else { toast.error("Duyệt thất bại."); }
  }

  const pg = usePagination(filtered, 20);

  function startNew() { setForm({ ...EMPTY }); setEditing(null); setShow(true); }
  function startEdit(r: ArticleRow) { setForm(toForm(r)); setEditing(r.slug); setShow(true); }

  function payload(f: Form) {
    return {
      title: f.title, excerpt: f.excerpt, category: f.category,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      coverImage: f.coverImage, coverAlt: f.coverAlt, authorName: f.authorName, authorTitle: f.authorTitle,
      bodyHtml: f.bodyHtml, featured: f.featured, status: f.status,
      seoMetaTitle: f.seoMetaTitle, seoMetaDescription: f.seoMetaDescription,
      seoKeywords: f.seoKeywords.split(",").map((t) => t.trim()).filter(Boolean),
      seoOgImage: f.seoOgImage, seoNoindex: f.seoNoindex,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Nhập tiêu đề."); return; }
    if (!form.coverImage) { toast.error("Cần ảnh bìa."); return; }
    setBusy(true);
    try {
      const body = payload(form);
      const res = await fetch(editing ? `/api/admin/articles/${editing}` : "/api/admin/articles", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      if (editing) {
        setRows((cur) => cur.map((r) => (r.slug === editing ? ({
          ...r, title: form.title, excerpt: form.excerpt, category: form.category, tags: body.tags,
          coverImage: form.coverImage, coverAlt: form.coverAlt, authorName: form.authorName, authorTitle: form.authorTitle,
          bodyHtml: form.bodyHtml, featured: form.featured, status: form.status,
        }) : r)));
      } else if (data.item) {
        setRows((cur) => [data.item as ArticleRow, ...cur]);
      }
      setShow(false);
      toast.success(editing ? "Đã cập nhật bài viết." : "Đã tạo bài viết.");
    } finally { setBusy(false); }
  }

  async function remove(r: ArticleRow) {
    if (!confirm(`Xoá bài "${r.title}"?`)) return;
    const res = await fetch(`/api/admin/articles/${r.slug}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.slug !== r.slug));
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-admin-toolbar">
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm theo tiêu đề…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="qp-select" style={{ maxWidth: 200 }} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="published">Đã xuất bản</option>
          <option value="draft">Bản nháp</option>
        </select>
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        {externalEnabled && (
          <ExternalNewsImport onImported={(items) => setRows((cur) => [...items, ...cur])} />
        )}
        <button type="button" className="qp-btn-primary" onClick={startNew}>+ Viết bài mới</button>
      </div>

      {show && (
        <div className="qp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShow(false); }}>
          <form className="qp-modal qp-admin-modal" onSubmit={submit} style={{ width: "min(860px, 100%)" }}>
            <div className="qp-modal__head">
              <b>{editing ? "Sửa bài viết" : "Viết bài mới"}</b>
              <button type="button" className="qp-icon-btn" aria-label="Đóng" onClick={() => setShow(false)}>✕</button>
            </div>
            <div className="qp-modal__body" style={{ padding: "var(--space-5)" }}>
              <div className="qp-form-group">
                <label className="qp-label">Tiêu đề <span className="req">*</span></label>
                <input className="qp-input" value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} placeholder="Tiêu đề bài viết" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label">Tóm tắt (sapo)</label>
                <textarea className="qp-textarea" value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="Tóm tắt ngắn hiển thị ở danh sách & SEO" />
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Chuyên mục <span className="req">*</span></label>
                  <select className="qp-select" value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div className="qp-form-group"><label className="qp-label">Thẻ (cách nhau dấu phẩy)</label>
                  <input className="qp-input" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="VD: Việc làm, Thông báo" /></div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group"><label className="qp-label">Tác giả</label>
                  <input className="qp-input" value={form.authorName} onChange={(e) => set("authorName", e.target.value)} /></div>
                <div className="qp-form-group"><label className="qp-label">Chức danh / đơn vị</label>
                  <input className="qp-input" value={form.authorTitle} onChange={(e) => set("authorTitle", e.target.value)} /></div>
              </div>
              <div className="qp-form-group">
                <label className="qp-label">Ảnh bìa <span className="req">*</span></label>
                <ImageUploader value={form.coverImage ? [form.coverImage] : []} onChange={(arr) => set("coverImage", arr[0] ?? "")} max={1} />
              </div>
              <div className="qp-form-group">
                <label className="qp-label">Mô tả ảnh (alt)</label>
                <input className="qp-input" value={form.coverAlt} onChange={(e) => set("coverAlt", e.target.value)} />
              </div>
              <div className="qp-form-group">
                <label className="qp-label">Nội dung</label>
                <RichTextEditor value={form.bodyHtml} onChange={(html) => set("bodyHtml", html)} placeholder="Soạn nội dung bài viết…" />
              </div>

              <details style={{ marginTop: 8 }}>
                <summary className="qp-label" style={{ cursor: "pointer" }}>Tối ưu SEO (tuỳ chọn)</summary>
                <div style={{ marginTop: 12 }}>
                  <div className="qp-form-group"><label className="qp-label">Meta title</label>
                    <input className="qp-input" value={form.seoMetaTitle} onChange={(e) => set("seoMetaTitle", e.target.value)} /></div>
                  <div className="qp-form-group"><label className="qp-label">Meta description</label>
                    <textarea className="qp-textarea" value={form.seoMetaDescription} onChange={(e) => set("seoMetaDescription", e.target.value)} /></div>
                  <div className="qp-acc-grid2">
                    <div className="qp-form-group"><label className="qp-label">Keywords (dấu phẩy)</label>
                      <input className="qp-input" value={form.seoKeywords} onChange={(e) => set("seoKeywords", e.target.value)} /></div>
                    <div className="qp-form-group"><label className="qp-label">OG image URL</label>
                      <input className="qp-input" value={form.seoOgImage} onChange={(e) => set("seoOgImage", e.target.value)} /></div>
                  </div>
                  <label className="qp-check"><input type="checkbox" checked={form.seoNoindex} onChange={(e) => set("seoNoindex", e.target.checked)} /> Ẩn khỏi công cụ tìm kiếm (noindex)</label>
                </div>
              </details>

              <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                <label className="qp-check"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Bài nổi bật</label>
                <label className="qp-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Trạng thái:
                  <select className="qp-select" style={{ width: 160 }} value={form.status} onChange={(e) => set("status", e.target.value as "draft" | "published")}>
                    <option value="draft">Bản nháp</option>
                    <option value="published">Xuất bản</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="qp-modal__foot">
              <button type="button" className="qp-btn-outline" onClick={() => setShow(false)}>Huỷ</button>
              <button type="submit" className="qp-btn-primary" disabled={busy}>{busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo bài"}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Chưa có bài viết</div><p className="type-body-small">Bấm “Viết bài mới” để bắt đầu.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Tiêu đề</th><th>Chuyên mục</th><th>Trạng thái</th><th>Lượt xem</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td>
                    <b>{r.title}</b>{r.featured ? <> <span className="qp-badge-g4">Nổi bật</span></> : null}
                    {r.pending && r.postedByName ? <div className="type-body-small text-muted">Người gửi: {r.postedByName}</div> : null}
                  </td>
                  <td>{r.category}</td>
                  <td>
                    {r.pending
                      ? <span className="qp-acc-badge is-pending">Chờ duyệt</span>
                      : <span className={`qp-acc-badge is-${r.status === "published" ? "active" : "pending"}`}>{r.status === "published" ? "Đã xuất bản" : "Nháp"}</span>}
                  </td>
                  <td>{r.views}</td>
                  <td className="qp-admin-actions">
                    <RowActions actions={[
                      { value: "approve", label: "Duyệt", hidden: !r.pending, run: () => approve(r) },
                      { value: "view", label: "Xem", hidden: r.status !== "published" || r.pending, run: () => window.open(`/tin-tuc/${r.slug}`, "_blank") },
                      { value: "edit", label: "Sửa", run: () => startEdit(r) },
                      { value: "delete", label: r.pending ? "Từ chối" : "Xoá", run: () => remove(r) },
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
