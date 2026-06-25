"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageUploader } from "@/components/common/ImageUploader";
import { RichTextEditor } from "@/components/lostfound/RichTextEditor";
import { useToast } from "@/components/common/Toast";
import { SeoScoreBadge } from "@/components/common/SeoScoreBadge";
import { scoreTitle, scoreExcerpt, scoreTags, scoreCoverAlt, scoreSeoMetaTitle, scoreSeoMetaDesc, scoreSeoKeywords, scoreSeoOgImage, scoreBody, countBodyWords, calcTotalSeoScore } from "@/lib/seo-score";
import type { ArticleScope } from "@/lib/news";

export type ArticleForm = {
  title: string; excerpt: string; category: string; scope: ArticleScope; tags: string;
  coverImage: string; coverAlt: string; authorName: string; authorTitle: string;
  bodyHtml: string; status: "draft" | "published";
  seoMetaTitle: string; seoMetaDescription: string; seoKeywords: string; seoOgImage: string; seoNoindex: boolean;
};

export const ARTICLE_FORM_EMPTY: ArticleForm = {
  title: "", excerpt: "", category: "", scope: "trong-xa", tags: "", coverImage: "", coverAlt: "",
  authorName: "Ban biên tập", authorTitle: "Quỳnh Phụ Tôi", bodyHtml: "", status: "draft",
  seoMetaTitle: "", seoMetaDescription: "", seoKeywords: "", seoOgImage: "", seoNoindex: false,
};

type Props = { editingSlug?: string; initialForm: ArticleForm; categories: string[] };
type Tab = "content" | "detail" | "seo";

function Counter({ val, max, warn = max - 20 }: { val: number; max: number; warn?: number }) {
  const cls = val >= max ? "is-full" : val >= warn ? "is-near" : "";
  return <span className={`qp-ae__fcount${cls ? " " + cls : ""}`}>{val}/{max}</span>;
}

export function ArticleEditorPage({ editingSlug, initialForm, categories }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<ArticleForm>(initialForm);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("content");

  type AiProvider = "gemini" | "openai" | "custom";
  const AI_PROVIDERS: { v: AiProvider; label: string }[] = [
    { v: "gemini", label: "Gemini" },
    { v: "openai", label: "OpenAI" },
    { v: "custom", label: "KiraAI / Tùy chỉnh" },
  ];

  const [aiOpen, setAiOpen] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
  const [aiTone, setAiTone] = useState<"chinh-thong" | "than-thien" | "thong-tin">("chinh-thong");
  const [aiLength, setAiLength] = useState<"ngan" | "vua" | "dai">("vua");
  const [aiCustom, setAiCustom] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  function openAi() { setAiOpen(true); setAiResult(null); setAiError(null); }
  function closeAi() { setAiOpen(false); setAiResult(null); setAiError(null); }

  // ── Viết lại nội dung gốc ──
  type RewriteResult = { title: string; excerpt: string; bodyHtml: string; tags: string; coverAlt?: string; seoMetaTitle: string; seoMetaDescription: string; seoKeywords: string };
  const [rwOpen, setRwOpen] = useState(false);
  const [rwText, setRwText] = useState("");
  const [rwProvider, setRwProvider] = useState<AiProvider>("gemini");
  const [rwBusy, setRwBusy] = useState(false);
  const [rwError, setRwError] = useState<string | null>(null);
  const [rwResult, setRwResult] = useState<RewriteResult | null>(null);

  function openRewrite() { setRwOpen(true); setRwText(""); setRwError(null); setRwResult(null); }
  function closeRewrite() { setRwOpen(false); setRwResult(null); setRwError(null); }

  async function doRewrite() {
    if (!rwText.trim()) return;
    setRwBusy(true); setRwError(null); setRwResult(null);
    try {
      const res = await fetch("/api/admin/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rwText.trim(), provider: rwProvider }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setRwError(data.error || "Có lỗi xảy ra."); return; }
      setRwResult(data as RewriteResult);
    } catch { setRwError("Không thể kết nối server."); }
    finally { setRwBusy(false); }
  }

  function applyRewrite() {
    if (!rwResult) return;
    setForm((f) => ({
      ...f,
      title:              rwResult.title              || f.title,
      excerpt:            rwResult.excerpt            || f.excerpt,
      bodyHtml:           rwResult.bodyHtml           || f.bodyHtml,
      tags:               rwResult.tags               || f.tags,
      coverAlt:           rwResult.coverAlt           || f.coverAlt,
      authorName:         f.authorName               || "Ban biên tập",
      authorTitle:        f.authorTitle              || "Quỳnh Phụ Tôi",
      seoMetaTitle:       rwResult.seoMetaTitle       || f.seoMetaTitle,
      seoMetaDescription: rwResult.seoMetaDescription || f.seoMetaDescription,
      seoKeywords:        rwResult.seoKeywords        || f.seoKeywords,
    }));
    closeRewrite();
    toast.success("Đã điền toàn bộ nội dung vào form.");
  }

  async function generateAI() {
    setAiGenerating(true);
    setAiError(null);
    try {
      const res = await fetch("/api/admin/ai/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, excerpt: form.excerpt, category: form.category, scope: form.scope, tone: aiTone, length: aiLength, customPrompt: aiCustom, provider: aiProvider }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setAiError(data.error || "Có lỗi xảy ra."); return; }
      setAiResult(data.html ?? "");
    } catch { setAiError("Không thể kết nối server."); }
    finally { setAiGenerating(false); }
  }

  function insertAIContent() {
    if (!aiResult) return;
    set("bodyHtml", aiResult);
    closeAi();
    toast.success("Đã chèn nội dung AI vào bài viết.");
  }

  function set<K extends keyof ArticleForm>(k: K, v: ArticleForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const catList = useMemo(() => {
    const base = categories ?? [];
    return form.category && !base.includes(form.category) ? [...base, form.category] : base;
  }, [categories, form.category]);

  const seo = useMemo(() => {
    const title      = scoreTitle(form.title);
    const excerpt    = scoreExcerpt(form.excerpt);
    const tags       = scoreTags(form.tags);
    const coverAlt   = scoreCoverAlt(form.coverAlt);
    const metaTitle  = scoreSeoMetaTitle(form.seoMetaTitle);
    const metaDesc   = scoreSeoMetaDesc(form.seoMetaDescription);
    const seoKeywords = scoreSeoKeywords(form.seoKeywords);
    const seoOgImage  = scoreSeoOgImage(form.seoOgImage);
    const body       = scoreBody(form.bodyHtml);
    const bodyWords  = countBodyWords(form.bodyHtml);
    const total      = calcTotalSeoScore({ title, excerpt, body, tags, coverAlt, metaTitle, metaDesc, seoKeywords, seoOgImage });
    return { title, excerpt, tags, coverAlt, metaTitle, metaDesc, seoKeywords, seoOgImage, body, bodyWords, total };
  }, [form.title, form.excerpt, form.tags, form.coverAlt, form.seoMetaTitle, form.seoMetaDescription, form.seoKeywords, form.seoOgImage, form.bodyHtml]);

  function buildPayload(f: ArticleForm) {
    return {
      title: f.title, excerpt: f.excerpt, category: f.category, scope: f.scope,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      coverImage: f.coverImage, coverAlt: f.coverAlt,
      authorName: f.authorName, authorTitle: f.authorTitle,
      bodyHtml: f.bodyHtml, status: f.status,
      seoMetaTitle: f.seoMetaTitle, seoMetaDescription: f.seoMetaDescription,
      seoKeywords: f.seoKeywords.split(",").map((t) => t.trim()).filter(Boolean),
      seoOgImage: f.seoOgImage, seoNoindex: f.seoNoindex,
    };
  }

  async function save(forcedStatus?: "draft" | "published") {
    const f = forcedStatus ? { ...form, status: forcedStatus } : form;
    if (!f.title.trim()) { toast.error("Nhập tiêu đề bài viết."); return; }
    if (!f.coverImage) { toast.error("Cần chọn ảnh bìa (tab Chi tiết)."); return; }
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

  const seoColor = seo.total >= 80 ? "green" : seo.total >= 60 ? "yellow" : "red";

  return (
    <>
    <div className="qp-admin-head">
      <Link href="/admin/tin-tuc" className="qp-admin-head__eyebrow">Tin tức</Link>
      <h1 className="type-h1">{editingSlug ? "Sửa bài viết" : "Viết bài mới"}</h1>
      {form.title && <span className="qp-admin-head__name">{form.title}</span>}
    </div>
    <div className="qp-ae">

      {/* ── Topbar + Tabs ── */}
      <div className="qp-ae__topbar">
        <div className="qp-ae__tabbar">
          <button type="button" className={`qp-ae__tab-btn${tab === "content" ? " is-active" : ""}`} onClick={() => setTab("content")}>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
            Nội dung
          </button>
          <button type="button" className={`qp-ae__tab-btn${tab === "detail" ? " is-active" : ""}`} onClick={() => setTab("detail")}>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            Chi tiết
          </button>
          <button type="button" className={`qp-ae__tab-btn${tab === "seo" ? " is-active" : ""}`} onClick={() => setTab("seo")}>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
            SEO
            {seo.total < 60 && <span className="qp-ae__tab-warn">!</span>}
          </button>
        </div>
        <div className="qp-ae__headeractions">
          <span className={`qp-ae__seo-pill qp-ae__seo-pill--${seoColor}`}>SEO {seo.total}/100</span>
          <button type="button" className="qp-ae__import-btn" onClick={openRewrite} disabled={busy} title="Dán nội dung gốc, AI viết lại và điền vào form">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
            Viết lại bằng AI
          </button>
          <button type="button" className="qp-btn-outline" onClick={() => router.push("/admin/tin-tuc")} disabled={busy}>Huỷ</button>
          <button type="button" className="qp-btn-outline" onClick={() => save("draft")} disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu nháp"}
          </button>
          <button type="button" className="qp-btn-primary" onClick={() => save("published")} disabled={busy}>
            {busy ? "Đang lưu…" : editingSlug ? "Lưu thay đổi" : "Xuất bản"}
          </button>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="qp-ae__tabcontent">

        {/* ── Tab: Nội dung ── */}
        {tab === "content" && (
          <div className="qp-ae__tab-panel">
            <div className="qp-ae__main-card">
              <div className="qp-ae__field">
                <label className="qp-ae__flabel">Tiêu đề <span className="req">*</span><SeoScoreBadge result={seo.title} /></label>
                <textarea
                  className="qp-ae__title-input"
                  value={form.title ?? ""}
                  maxLength={200}
                  rows={2}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Nhập tiêu đề bài viết…"
                />
                <div className="qp-ae__ffoot"><Counter val={(form.title ?? "").length} max={200} warn={160} /></div>
              </div>
              <div className="qp-ae__field qp-ae__field--last">
                <label className="qp-ae__flabel">Tóm tắt (sapo)<SeoScoreBadge result={seo.excerpt} /></label>
                <textarea className="qp-textarea" rows={3} value={form.excerpt ?? ""}
                  onChange={(e) => set("excerpt", e.target.value)}
                  placeholder="Tóm tắt ngắn hiển thị ở danh sách bài & SEO description" />
                <div className="qp-ae__ffoot"><Counter val={(form.excerpt ?? "").length} max={300} warn={260} /></div>
              </div>
            </div>

            <div className="qp-ae__main-card qp-ae__main-card--editor">
              <div className="qp-ae__editor-header">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Nội dung bài viết
                <SeoScoreBadge result={seo.body} />
                {seo.bodyWords > 0 && <span className="qp-ae__fcount">{seo.bodyWords} từ</span>}
                <button type="button" className="qp-ae__ai-btn" onClick={openAi} title="Tạo nội dung bài viết bằng Gemini AI">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Tạo bằng AI
                </button>
              </div>
              <RichTextEditor value={form.bodyHtml} onChange={(html) => set("bodyHtml", html)}
                placeholder="Soạn nội dung bài viết…" />
            </div>
          </div>
        )}

        {/* ── Tab: Chi tiết ── */}
        {tab === "detail" && (
          <div className="qp-ae__tab-panel--detail">

            {/* Xuất bản */}
            <div className="qp-ae__scard">
              <div className="qp-ae__scard-head">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
                Xuất bản
              </div>
              <div className="qp-ae__scard-body">
                <div className="qp-ae__field">
                  <span className="qp-ae__flabel">Trạng thái</span>
                  <div className="qp-ae__seg">
                    <button type="button" className={`qp-ae__seg-btn${form.status === "draft" ? " is-draft" : ""}`} onClick={() => set("status", "draft")}>Bản nháp</button>
                    <button type="button" className={`qp-ae__seg-btn${form.status === "published" ? " is-pub" : ""}`} onClick={() => set("status", "published")}>Xuất bản</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ảnh bìa */}
            <div className="qp-ae__scard">
              <div className="qp-ae__scard-head">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Ảnh bìa <span className="req">*</span>
              </div>
              <div className="qp-ae__scard-body">
                <ImageUploader
                  value={form.coverImage ? [form.coverImage] : []}
                  onChange={(arr) => set("coverImage", arr[0] ?? "")}
                  subfolder="tin-tuc"
                  max={1}
                />
                <div className="qp-ae__field" style={{ marginTop: 12, marginBottom: 0 }}>
                  <label className="qp-ae__flabel">Mô tả ảnh (alt)<SeoScoreBadge result={seo.coverAlt} /></label>
                  <input className="qp-input" value={form.coverAlt}
                    onChange={(e) => set("coverAlt", e.target.value)}
                    placeholder="Mô tả ngắn cho ảnh bìa" />
                </div>
                <p className="qp-ae__cover-hint">Khuyến nghị 16:9 · tối thiểu 800×450 px.</p>
              </div>
            </div>

            {/* Phân loại */}
            <div className="qp-ae__scard">
              <div className="qp-ae__scard-head">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                </svg>
                Phân loại
              </div>
              <div className="qp-ae__scard-body">
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Chuyên mục <span className="req">*</span></label>
                  <select className="qp-select" value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {catList.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Phạm vi <span className="req">*</span></label>
                  <div className="qp-ae__seg">
                    <button type="button" className={`qp-ae__seg-btn${form.scope === "trong-xa" ? " is-draft" : ""}`} onClick={() => set("scope", "trong-xa")}>Trong xã</button>
                    <button type="button" className={`qp-ae__seg-btn${form.scope === "ngoai-xa" ? " is-draft" : ""}`} onClick={() => set("scope", "ngoai-xa")}>Ngoài xã</button>
                  </div>
                </div>
                <div className="qp-ae__field qp-ae__field--last">
                  <label className="qp-ae__flabel">Thẻ (cách nhau dấu phẩy)<SeoScoreBadge result={seo.tags} /></label>
                  <input className="qp-input" value={form.tags} onChange={(e) => set("tags", e.target.value)}
                    placeholder="VD: Việc làm, Thông báo" />
                </div>
              </div>
            </div>

            {/* Tác giả */}
            <div className="qp-ae__scard">
              <div className="qp-ae__scard-head">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Tác giả
              </div>
              <div className="qp-ae__scard-body">
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Tên tác giả</label>
                  <input className="qp-input" value={form.authorName} onChange={(e) => set("authorName", e.target.value)} />
                </div>
                <div className="qp-ae__field qp-ae__field--last">
                  <label className="qp-ae__flabel">Chức danh / đơn vị</label>
                  <input className="qp-input" value={form.authorTitle} onChange={(e) => set("authorTitle", e.target.value)} />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Tab: SEO ── */}
        {tab === "seo" && (
          <div className="qp-ae__tab-panel">

            {/* Score overview */}
            <div className="qp-ae__main-card" style={{ padding: "18px 24px" }}>
              <div className="qp-ae__seo-total" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
                <span className="qp-ae__seo-total-lbl">Điểm SEO</span>
                <div className="qp-ae__seo-bar">
                  <div className="qp-ae__seo-bar-fill"
                    style={{ width: `${seo.total}%`, background: seo.total >= 80 ? "var(--color-teal)" : seo.total >= 60 ? "var(--color-warning)" : "var(--color-error)" }}
                  />
                </div>
                <span className="qp-ae__seo-total-num">{seo.total}/100</span>
                <span className={`qp-seo-badge qp-seo-badge--${seoColor}`}>
                  {seo.total >= 80 ? "Tốt" : seo.total >= 60 ? "Khá" : "Cần cải thiện"}
                </span>
              </div>
            </div>

            {/* SEO fields */}
            <div className="qp-ae__scard">
              <div className="qp-ae__scard-head">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                SEO & nâng cao
              </div>
              <div className="qp-ae__scard-body">
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Meta title<SeoScoreBadge result={seo.metaTitle} /></label>
                  <input className="qp-input" value={form.seoMetaTitle} onChange={(e) => set("seoMetaTitle", e.target.value)} placeholder="Để trống → dùng tiêu đề bài viết" />
                </div>
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Meta description<SeoScoreBadge result={seo.metaDesc} /></label>
                  <textarea className="qp-textarea" rows={2} value={form.seoMetaDescription} onChange={(e) => set("seoMetaDescription", e.target.value)} placeholder="Để trống → dùng tóm tắt (sapo)" />
                </div>
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">Keywords (dấu phẩy)<SeoScoreBadge result={seo.seoKeywords} /></label>
                  <input className="qp-input" value={form.seoKeywords} onChange={(e) => set("seoKeywords", e.target.value)} />
                </div>
                <div className="qp-ae__field">
                  <label className="qp-ae__flabel">OG image URL<SeoScoreBadge result={seo.seoOgImage} /></label>
                  <input className="qp-input" value={form.seoOgImage} onChange={(e) => set("seoOgImage", e.target.value)} placeholder="Để trống → dùng ảnh bìa" />
                </div>
                <div
                  className="qp-ae__toggle-row"
                  onClick={() => set("seoNoindex", !form.seoNoindex)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && set("seoNoindex", !form.seoNoindex)}
                >
                  <div className="qp-ae__toggle-info">
                    <span className="qp-ae__toggle-title">Ẩn khỏi Google</span>
                    <span className="qp-ae__toggle-sub">Thêm thẻ noindex</span>
                  </div>
                  <div className={`qp-ae__switch${form.seoNoindex ? " is-on" : ""}`} aria-hidden="true">
                    <span className="qp-ae__switch-thumb" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── Viết lại nội dung gốc Modal ── */}
      {rwOpen && (
        <div className="qp-ai-modal" role="dialog" aria-modal="true" aria-label="Viết lại nội dung gốc">
          <div className="qp-ai-modal__backdrop" onClick={closeRewrite} />
          <div className="qp-ai-modal__dialog" style={{ maxWidth: 560 }}>
            <div className="qp-ai-modal__head">
              <svg className="qp-ai-modal__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
              </svg>
              <span className="qp-ai-modal__title">Viết lại bằng AI</span>
              <button type="button" className="qp-ai-modal__close" onClick={closeRewrite} aria-label="Đóng">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <div className="qp-ai-modal__body">
              {!rwResult ? (
                <>
                  <p style={{ fontSize: 13, color: "var(--color-gray-text)", margin: 0 }}>
                    Copy nội dung từ bất kỳ nguồn nào (báo, Facebook…) rồi dán vào đây. AI sẽ viết lại hoàn toàn và tự điền <strong>tiêu đề · sapo · nội dung · tags · SEO</strong>.
                  </p>
                  <div>
                    <div className="qp-ai-modal__label">Dùng AI</div>
                    <div className="qp-ai-modal__seg">
                      {AI_PROVIDERS.map(({ v, label }) => (
                        <button key={v} type="button" className={`qp-ai-modal__seg-btn${rwProvider === v ? " is-on" : ""}`} onClick={() => setRwProvider(v)}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="qp-ai-modal__label">Nội dung gốc</div>
                    <textarea
                      className="qp-textarea"
                      rows={8}
                      placeholder="Dán nội dung bài viết gốc vào đây…"
                      value={rwText}
                      onChange={(e) => setRwText(e.target.value)}
                      disabled={rwBusy}
                      autoFocus
                      style={{ resize: "vertical" }}
                    />
                    <div style={{ fontSize: 11, color: "var(--color-gray-text)", marginTop: 4 }}>
                      {rwText.trim().length} ký tự
                    </div>
                  </div>
                  {(form.title || form.bodyHtml) && (
                    <p style={{ fontSize: 12, color: "var(--color-warning)", fontWeight: 600, margin: 0 }}>
                      ⚠ Các ô hiện tại sẽ bị ghi đè sau khi điền.
                    </p>
                  )}
                  {rwError && <p style={{ fontSize: 13, color: "var(--color-error)", margin: 0 }}>{rwError}</p>}
                  <div className="qp-ai-modal__actions">
                    <button type="button" className="qp-btn-primary" onClick={doRewrite}
                      disabled={rwBusy || rwText.trim().length < 50}>
                      {rwBusy ? "Đang viết lại…" : "✨ Viết lại"}
                    </button>
                    <button type="button" className="qp-btn-outline" onClick={closeRewrite} disabled={rwBusy}>Huỷ</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="qp-ai-modal__insert-row">
                    <span className="qp-ai-modal__badge">✓ Đã viết lại xong</span>
                    <span style={{ fontSize: 12, color: "var(--color-gray-text)" }}>
                      ~{rwResult.bodyHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length} từ
                    </span>
                  </div>
                  <div className="qp-ai-modal__ctx">
                    <div className="qp-ai-modal__ctx-label">Tiêu đề</div>
                    <div className="qp-ai-modal__ctx-title">{rwResult.title}</div>
                  </div>
                  {rwResult.excerpt && (
                    <div className="qp-ai-modal__ctx">
                      <div className="qp-ai-modal__ctx-label">Sapo</div>
                      <div className="qp-ai-modal__ctx-excerpt">{rwResult.excerpt}</div>
                    </div>
                  )}
                  {rwResult.tags && (
                    <div className="qp-ai-modal__ctx">
                      <div className="qp-ai-modal__ctx-label">Tags</div>
                      <div className="qp-ai-modal__ctx-excerpt">{rwResult.tags}</div>
                    </div>
                  )}
                  {rwResult.seoMetaTitle && (
                    <div className="qp-ai-modal__ctx">
                      <div className="qp-ai-modal__ctx-label">SEO Meta Title</div>
                      <div className="qp-ai-modal__ctx-excerpt">{rwResult.seoMetaTitle}</div>
                    </div>
                  )}
                  <div className="qp-ai-modal__actions">
                    <button type="button" className="qp-btn-primary" onClick={applyRewrite}>Điền vào form</button>
                    <button type="button" className="qp-btn-outline" onClick={() => setRwResult(null)}>Viết lại khác</button>
                    <button type="button" className="qp-btn-outline" onClick={closeRewrite}>Đóng</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Content Generator Modal ── */}
      {aiOpen && (
        <div className="qp-ai-modal" role="dialog" aria-modal="true" aria-label="Tạo nội dung bằng AI">
          <div className="qp-ai-modal__backdrop" onClick={closeAi} />
          <div className="qp-ai-modal__dialog">
            <div className="qp-ai-modal__head">
              <svg className="qp-ai-modal__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="qp-ai-modal__title">Tạo nội dung bằng AI</span>
              <button type="button" className="qp-ai-modal__close" onClick={closeAi} aria-label="Đóng">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <div className="qp-ai-modal__body">
              <div className="qp-ai-modal__ctx">
                <div className="qp-ai-modal__ctx-label">Bài viết</div>
                <div className="qp-ai-modal__ctx-title">
                  {form.title.trim() || <em style={{ fontWeight: 400, color: "var(--color-gray-text)" }}>Chưa có tiêu đề</em>}
                </div>
                {form.excerpt.trim() && <div className="qp-ai-modal__ctx-excerpt">{form.excerpt}</div>}
              </div>
              {!aiResult && (
                <>
                  <div>
                    <div className="qp-ai-modal__label">Dùng AI</div>
                    <div className="qp-ai-modal__seg">
                      {AI_PROVIDERS.map(({ v, label }) => (
                        <button key={v} type="button" className={`qp-ai-modal__seg-btn${aiProvider === v ? " is-on" : ""}`} onClick={() => setAiProvider(v)}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="qp-ai-modal__label">Giọng văn</div>
                    <div className="qp-ai-modal__seg">
                      {(["chinh-thong", "than-thien", "thong-tin"] as const).map((v) => {
                        const labels = { "chinh-thong": "Chính thống", "than-thien": "Thân thiện", "thong-tin": "Thông tin" };
                        return <button key={v} type="button" className={`qp-ai-modal__seg-btn${aiTone === v ? " is-on" : ""}`} onClick={() => setAiTone(v)}>{labels[v]}</button>;
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="qp-ai-modal__label">Độ dài</div>
                    <div className="qp-ai-modal__seg">
                      {(["ngan", "vua", "dai"] as const).map((v) => {
                        const labels = { "ngan": "Ngắn (~500 từ)", "vua": "Vừa (~900 từ)", "dai": "Dài (~1500 từ)" };
                        return <button key={v} type="button" className={`qp-ai-modal__seg-btn${aiLength === v ? " is-on" : ""}`} onClick={() => setAiLength(v)}>{labels[v]}</button>;
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="qp-ai-modal__label">
                      Hướng dẫn thêm&nbsp;<span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(tuỳ chọn)</span>
                    </div>
                    <textarea className="qp-textarea" rows={2}
                      placeholder="VD: Nêu rõ lợi ích cho người dân địa phương, tránh dùng từ ngữ kỹ thuật…"
                      value={aiCustom} onChange={(e) => setAiCustom(e.target.value)} />
                  </div>
                  {form.bodyHtml && (
                    <p style={{ fontSize: 12, color: "var(--color-warning)", fontWeight: 600, margin: 0 }}>
                      ⚠ Nội dung hiện tại sẽ bị thay thế khi bấm "Chèn vào bài".
                    </p>
                  )}
                  {aiError && <p style={{ fontSize: 13, color: "var(--color-error)", margin: 0 }}>{aiError}</p>}
                  <div className="qp-ai-modal__actions">
                    <button type="button" className="qp-btn-primary" onClick={generateAI} disabled={aiGenerating || !form.title.trim()}>
                      {aiGenerating ? "Đang tạo…" : "✨ Tạo nội dung"}
                    </button>
                    <button type="button" className="qp-btn-outline" onClick={closeAi} disabled={aiGenerating}>Huỷ</button>
                  </div>
                </>
              )}
              {aiResult && (
                <>
                  <div className="qp-ai-modal__insert-row">
                    <span className="qp-ai-modal__badge">✓ Đã tạo xong</span>
                    <span style={{ fontSize: 12, color: "var(--color-gray-text)" }}>
                      ~{aiResult.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length} từ
                    </span>
                  </div>
                  <div className="qp-ai-modal__preview" dangerouslySetInnerHTML={{ __html: aiResult }} />
                  <div className="qp-ai-modal__actions">
                    <button type="button" className="qp-btn-primary" onClick={insertAIContent}>Chèn vào bài</button>
                    <button type="button" className="qp-btn-outline" onClick={() => setAiResult(null)}>Thử lại</button>
                    <button type="button" className="qp-btn-outline" onClick={closeAi}>Đóng</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
