"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageUploader } from "@/components/common/ImageUploader";
import { RichTextEditor } from "@/components/lostfound/RichTextEditor";
import { useToast } from "@/components/common/Toast";
import type { ArticleScope } from "@/lib/news";

type EditorTab = "info" | "content" | "seo";

export type ArticleForm = {
  title: string; excerpt: string; category: string; scope: ArticleScope; tags: string;
  coverImage: string; coverAlt: string; authorName: string; authorTitle: string;
  bodyHtml: string; featured: boolean; status: "draft" | "published";
  seoMetaTitle: string; seoMetaDescription: string; seoKeywords: string; seoOgImage: string; seoNoindex: boolean;
};

export const ARTICLE_FORM_EMPTY: ArticleForm = {
  title: "", excerpt: "", category: "", scope: "trong-xa", tags: "", coverImage: "", coverAlt: "",
  authorName: "Ban biên tập", authorTitle: "", bodyHtml: "", featured: false, status: "draft",
  seoMetaTitle: "", seoMetaDescription: "", seoKeywords: "", seoOgImage: "", seoNoindex: false,
};

type Props = {
  editingSlug?: string;
  initialForm: ArticleForm;
  categories: string[];
};

const TABS: { id: EditorTab; label: string; icon: string }[] = [
  { id: "info",    label: "Thông tin",        icon: "📝" },
  { id: "content", label: "Nội dung & Ảnh",   icon: "🖼️" },
  { id: "seo",     label: "SEO & Xuất bản",   icon: "🚀" },
];

export function ArticleEditorPage({ editingSlug, initialForm, categories }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<ArticleForm>(initialForm);
  const [tab, setTab] = useState<EditorTab>("info");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof ArticleForm>(k: K, v: ArticleForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const catList = useMemo(() => {
    const base = categories ?? [];
    return form.category && !base.includes(form.category) ? [...base, form.category] : base;
  }, [categories, form.category]);

  function buildPayload(f: ArticleForm) {
    return {
      title: f.title, excerpt: f.excerpt, category: f.category, scope: f.scope,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      coverImage: f.coverImage, coverAlt: f.coverAlt,
      authorName: f.authorName, authorTitle: f.authorTitle,
      bodyHtml: f.bodyHtml, featured: f.featured, status: f.status,
      seoMetaTitle: f.seoMetaTitle, seoMetaDescription: f.seoMetaDescription,
      seoKeywords: f.seoKeywords.split(",").map((t) => t.trim()).filter(Boolean),
      seoOgImage: f.seoOgImage, seoNoindex: f.seoNoindex,
    };
  }

  async function save(forcedStatus?: "draft" | "published") {
    const f = forcedStatus ? { ...form, status: forcedStatus } : form;
    if (!f.title.trim()) { toast.error("Nhập tiêu đề bài viết."); setTab("info"); return; }
    if (!f.coverImage) { toast.error("Cần chọn ảnh bìa."); setTab("content"); return; }
    setBusy(true);
    try {
      const res = await fetch(
        editingSlug ? `/api/admin/articles/${editingSlug}` : "/api/admin/articles",
        { method: editingSlug ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload(f)) },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Có lỗi xảy ra."); return; }
      toast.success(editingSlug ? "Đã cập nhật bài viết." : "Đã tạo bài viết.");
      router.push("/admin/tin-tuc");
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="qp-ae">
      {/* Sticky top bar */}
      <div className="qp-ae__topbar">
        <div className="qp-ae__breadcrumb">
          <Link href="/admin/tin-tuc" className="qp-ae__back">← Tin tức</Link>
          <span className="qp-ae__pagetitle">
            {editingSlug ? (form.title ? `Sửa: ${form.title}` : "Sửa bài viết") : "Viết bài mới"}
          </span>
        </div>
        <div className="qp-ae__headeractions">
          <button type="button" className="qp-btn-outline" onClick={() => router.push("/admin/tin-tuc")} disabled={busy}>
            Huỷ
          </button>
          <button type="button" className="qp-btn-outline" onClick={() => save("draft")} disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu nháp"}
          </button>
          <button type="button" className="qp-btn-primary" onClick={() => save("published")} disabled={busy}>
            {busy ? "Đang lưu…" : editingSlug ? "Lưu thay đổi" : "Xuất bản"}
          </button>
        </div>
      </div>

      {/* Card: tab bar + content */}
      <div className="qp-ae__card">
        <div className="qp-ae__tabbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`qp-ae__tab${tab === t.id ? " is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="qp-ae__body">
          {/* ── Tab 1: Thông tin ── */}
          {tab === "info" && (
            <div className="qp-ae__panel">
              <div className="qp-form-group">
                <label className="qp-label">Tiêu đề <span className="req">*</span></label>
                <input className="qp-input" value={form.title} maxLength={200}
                  onChange={(e) => set("title", e.target.value)} placeholder="Tiêu đề bài viết" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label">Tóm tắt (sapo)</label>
                <textarea className="qp-textarea" rows={3} value={form.excerpt}
                  onChange={(e) => set("excerpt", e.target.value)}
                  placeholder="Tóm tắt ngắn hiển thị ở danh sách bài & SEO description" />
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group">
                  <label className="qp-label">Chuyên mục <span className="req">*</span></label>
                  <select className="qp-select" value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {catList.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="qp-form-group">
                  <label className="qp-label">Phạm vi <span className="req">*</span></label>
                  <select className="qp-select" value={form.scope} onChange={(e) => set("scope", e.target.value as ArticleScope)}>
                    <option value="trong-xa">Trong xã</option>
                    <option value="ngoai-xa">Ngoài xã</option>
                  </select>
                </div>
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group">
                  <label className="qp-label">Tên tác giả</label>
                  <input className="qp-input" value={form.authorName} onChange={(e) => set("authorName", e.target.value)} />
                </div>
                <div className="qp-form-group">
                  <label className="qp-label">Chức danh / đơn vị</label>
                  <input className="qp-input" value={form.authorTitle} onChange={(e) => set("authorTitle", e.target.value)} />
                </div>
              </div>
              <div className="qp-form-group">
                <label className="qp-label">Thẻ (cách nhau dấu phẩy)</label>
                <input className="qp-input" value={form.tags} onChange={(e) => set("tags", e.target.value)}
                  placeholder="VD: Việc làm, Thông báo, Quỳnh Phụ" />
              </div>
            </div>
          )}

          {/* ── Tab 2: Nội dung & Ảnh ── */}
          {tab === "content" && (
            <div className="qp-ae__panel">
              <div className="qp-ae__content-layout">
                <div className="qp-ae__cover-col">
                  <div className="qp-form-group">
                    <label className="qp-label">Ảnh bìa <span className="req">*</span></label>
                    <ImageUploader
                      value={form.coverImage ? [form.coverImage] : []}
                      onChange={(arr) => set("coverImage", arr[0] ?? "")}
                      max={1}
                    />
                  </div>
                  <div className="qp-form-group">
                    <label className="qp-label">Mô tả ảnh (alt)</label>
                    <input className="qp-input" value={form.coverAlt}
                      onChange={(e) => set("coverAlt", e.target.value)}
                      placeholder="Mô tả ngắn cho ảnh bìa (hỗ trợ SEO)" />
                  </div>
                  <p className="qp-ae__cover-hint">Tỉ lệ khuyến nghị 16:9, tối thiểu 800×450&nbsp;px.</p>
                </div>
                <div className="qp-ae__body-col">
                  <div className="qp-form-group">
                    <label className="qp-label">Nội dung bài viết</label>
                    <RichTextEditor value={form.bodyHtml} onChange={(html) => set("bodyHtml", html)}
                      placeholder="Soạn nội dung bài viết…" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 3: SEO & Xuất bản ── */}
          {tab === "seo" && (
            <div className="qp-ae__panel">
              <p className="qp-admin-section-title">Xuất bản</p>
              <div className="qp-ae__publish-row">
                <label className="qp-check">
                  <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
                  Đánh dấu bài nổi bật
                </label>
                <div className="qp-form-group" style={{ marginBottom: 0 }}>
                  <label className="qp-label">Trạng thái</label>
                  <select className="qp-select" style={{ maxWidth: 200 }} value={form.status}
                    onChange={(e) => set("status", e.target.value as "draft" | "published")}>
                    <option value="draft">Bản nháp</option>
                    <option value="published">Xuất bản ngay</option>
                  </select>
                </div>
              </div>

              <p className="qp-admin-section-title" style={{ marginTop: "var(--space-5)" }}>Tối ưu SEO</p>
              <div className="qp-form-group">
                <label className="qp-label">Meta title</label>
                <input className="qp-input" value={form.seoMetaTitle}
                  onChange={(e) => set("seoMetaTitle", e.target.value)}
                  placeholder="Để trống → dùng tiêu đề bài viết" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label">Meta description</label>
                <textarea className="qp-textarea" rows={3} value={form.seoMetaDescription}
                  onChange={(e) => set("seoMetaDescription", e.target.value)}
                  placeholder="Để trống → dùng tóm tắt (sapo)" />
              </div>
              <div className="qp-acc-grid2">
                <div className="qp-form-group">
                  <label className="qp-label">Keywords (dấu phẩy)</label>
                  <input className="qp-input" value={form.seoKeywords}
                    onChange={(e) => set("seoKeywords", e.target.value)} />
                </div>
                <div className="qp-form-group">
                  <label className="qp-label">OG image URL</label>
                  <input className="qp-input" value={form.seoOgImage}
                    onChange={(e) => set("seoOgImage", e.target.value)}
                    placeholder="Để trống → dùng ảnh bìa" />
                </div>
              </div>
              <label className="qp-check">
                <input type="checkbox" checked={form.seoNoindex}
                  onChange={(e) => set("seoNoindex", e.target.checked)} />
                Ẩn khỏi công cụ tìm kiếm (noindex)
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
