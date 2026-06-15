"use client";

// Quản trị SEO TỪNG TRANG: mỗi trang client một thẻ, override title/description/
// keywords/OG image/noindex. Ô trống = giữ mặc định của trang.
import { useState } from "react";
import { useToast } from "@/components/common/Toast";
import type { PageSeoConfig, PageSeoOverride } from "@/lib/page-seo";

const DEFS: { key: string; label: string }[] = [
  { key: "/tin-tuc", label: "Tin tức" },
  { key: "/viec-lam", label: "Việc làm" },
  { key: "/mua-ban", label: "Mua bán" },
  { key: "/tim-do-roi", label: "Tìm đồ rơi" },
  { key: "/truong-hoc", label: "Trường học" },
  { key: "/y-te", label: "Y tế" },
  { key: "/giao-thong", label: "Giao thông" },
  { key: "/di-tich", label: "Di tích" },
  { key: "/cho", label: "Chợ" },
  { key: "/tong-quan", label: "Tổng quan" },
  { key: "/sap-nhap", label: "Sáp nhập 2025" },
  { key: "/lien-he", label: "Liên hệ" },
  { key: "/quang-cao", label: "Quảng cáo" },
];

export function PageSeoManager({ initialConfig }: { initialConfig: PageSeoConfig }) {
  const [cfg, setCfg] = useState<PageSeoConfig>(initialConfig);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  function patch(key: string, p: Partial<PageSeoOverride>) {
    setCfg((cur) => ({ ...cur, [key]: { ...cur[key], ...p } }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/page-seo", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: cfg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Lưu thất bại."); return; }
      if (data.config) setCfg(data.config);
      toast.success("Đã lưu SEO từng trang. Áp dụng ngay cho lượt truy cập tiếp theo.");
    } finally { setBusy(false); }
  }

  return (
    <div className="qp-acc-page">
      <p className="qp-admin-head__desc" style={{ marginBottom: 16 }}>
        Mỗi trang có thể đặt riêng tiêu đề, mô tả, từ khoá và ảnh chia sẻ. <b>Ô trống = dùng mặc định</b> cài sẵn của trang.
        Áp dụng ngay, không cần build lại.
      </p>

      {DEFS.map((d) => {
        const ov = cfg[d.key] ?? {};
        return (
          <div className="qp-acc-card" key={d.key}>
            <div className="qp-acc-card__title qp-acc-card__title--row" style={{ marginBottom: 12 }}>
              <span>{d.label} <code className="type-body-small text-muted">{d.key}</code></span>
              <label className="qp-check" style={{ margin: 0 }}>
                <input type="checkbox" checked={!!ov.noindex} onChange={(e) => patch(d.key, { noindex: e.target.checked })} /> Ẩn khỏi Google (noindex)
              </label>
            </div>

            <div className="qp-form-group">
              <label className="qp-label">Tiêu đề (title)</label>
              <input className="qp-input" maxLength={200} value={ov.title ?? ""} onChange={(e) => patch(d.key, { title: e.target.value })} placeholder="Để trống = tiêu đề mặc định của trang" />
            </div>
            <div className="qp-form-group">
              <label className="qp-label">Mô tả (description)</label>
              <textarea className="qp-textarea" maxLength={300} value={ov.description ?? ""} onChange={(e) => patch(d.key, { description: e.target.value })} placeholder="Để trống = mô tả mặc định của trang (≈160 ký tự)" />
            </div>
            <div className="qp-acc-grid2">
              <div className="qp-form-group">
                <label className="qp-label">Từ khoá (cách nhau dấu phẩy)</label>
                <input className="qp-input" maxLength={400} value={ov.keywords ?? ""} onChange={(e) => patch(d.key, { keywords: e.target.value })} placeholder="VD: việc làm Quỳnh Phụ, tuyển dụng…" />
              </div>
              <div className="qp-form-group">
                <label className="qp-label">Ảnh chia sẻ OG (URL)</label>
                <input className="qp-input" maxLength={500} value={ov.ogImage ?? ""} onChange={(e) => patch(d.key, { ogImage: e.target.value })} placeholder="/img/og-tin-tuc.png hoặc https://…" />
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button type="button" className="qp-btn-primary" onClick={save} disabled={busy}>{busy ? "Đang lưu…" : "Lưu SEO từng trang"}</button>
      </div>
    </div>
  );
}
