"use client";

// Tab "SEO" cho 1 trang client (dùng trong từng module). Override title/description/
// keywords/OG image/noindex. Ô trống = giữ mặc định của trang. Lưu gộp 1 trang qua
// /api/admin/page-seo (body { key, override }) — không đụng SEO của trang khác.
import { useState } from "react";
import { useToast } from "@/components/common/Toast";
import type { PageSeoOverride } from "@/lib/page-seo";

export function PageSeoTab({ pageKey, initial }: { pageKey: string; initial: PageSeoOverride }) {
  const [ov, setOv] = useState<PageSeoOverride>(initial ?? {});
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const patch = (p: Partial<PageSeoOverride>) => setOv((c) => ({ ...c, ...p }));

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/page-seo", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: pageKey, override: ov }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Lưu thất bại."); return; }
      if (data.config) setOv(data.config[pageKey] ?? {});
      toast.success("Đã lưu SEO trang. Áp dụng ngay cho lượt truy cập tiếp theo.");
    } finally { setBusy(false); }
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-acc-card">
        <div className="qp-acc-card__title qp-acc-card__title--row" style={{ marginBottom: 12 }}>
          <span>SEO riêng cho trang này <code className="type-body-small text-muted">{pageKey}</code></span>
          <label className="qp-check" style={{ margin: 0 }}>
            <input type="checkbox" checked={!!ov.noindex} onChange={(e) => patch({ noindex: e.target.checked })} /> Ẩn khỏi Google (noindex)
          </label>
        </div>
        <p className="type-body-small text-muted" style={{ marginTop: -4, marginBottom: 12 }}>
          <b>Ô trống = dùng mặc định</b> cài sẵn của trang. Áp dụng ngay, không cần build lại.
        </p>

        <div className="qp-form-group">
          <label className="qp-label">Tiêu đề (title)</label>
          <input className="qp-input" maxLength={200} value={ov.title ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder="Để trống = tiêu đề mặc định của trang" />
        </div>
        <div className="qp-form-group">
          <label className="qp-label">Mô tả (description)</label>
          <textarea className="qp-textarea" maxLength={300} value={ov.description ?? ""} onChange={(e) => patch({ description: e.target.value })} placeholder="Để trống = mô tả mặc định của trang (≈160 ký tự)" />
        </div>
        <div className="qp-acc-grid2">
          <div className="qp-form-group">
            <label className="qp-label">Từ khoá (cách nhau dấu phẩy)</label>
            <input className="qp-input" maxLength={400} value={ov.keywords ?? ""} onChange={(e) => patch({ keywords: e.target.value })} placeholder="VD: việc làm Quỳnh Phụ, tuyển dụng…" />
          </div>
          <div className="qp-form-group">
            <label className="qp-label">Ảnh chia sẻ OG (URL)</label>
            <input className="qp-input" maxLength={500} value={ov.ogImage ?? ""} onChange={(e) => patch({ ogImage: e.target.value })} placeholder="/img/og-tin-tuc.png hoặc https://…" />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button type="button" className="qp-btn-primary" onClick={save} disabled={busy}>{busy ? "Đang lưu…" : "Lưu SEO trang"}</button>
      </div>
    </div>
  );
}
