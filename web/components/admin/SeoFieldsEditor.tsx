"use client";

// Khối nhập SEO tuỳ chọn dùng chung cho mọi form admin (quảng cáo, trường học, y tế,
// giao thông, chợ, di tích). Mirror khối "Tối ưu SEO" của ArticleManager. Tự quản lý
// chuỗi keywords nội bộ (tránh lỗi gõ khi tách dấu phẩy theo từng phím) và emit SeoFields.
import { useState } from "react";
import type { SeoFields } from "@/lib/seo-fields";

export function SeoFieldsEditor({
  value,
  onChange,
}: {
  value?: SeoFields;
  onChange: (v: SeoFields) => void;
}) {
  const v = value ?? {};
  const [kw, setKw] = useState((v.keywords ?? []).join(", "));
  const set = (patch: Partial<SeoFields>) => onChange({ ...v, ...patch });

  return (
    <details style={{ marginTop: 8 }}>
      <summary className="qp-label" style={{ cursor: "pointer" }}>Tối ưu SEO (tuỳ chọn)</summary>
      <div style={{ marginTop: 12 }}>
        <p className="type-body-small text-muted" style={{ marginTop: 0 }}>
          Để trống = tự sinh từ nội dung. Chỉ điền khi muốn ghi đè hiển thị trên Google / mạng xã hội.
        </p>
        <div className="qp-form-group">
          <label className="qp-label">Meta title</label>
          <input className="qp-input" value={v.metaTitle ?? ""} maxLength={200}
            onChange={(e) => set({ metaTitle: e.target.value })}
            placeholder="Tiêu đề hiển thị trên Google (≈ 60 ký tự là đẹp)" />
        </div>
        <div className="qp-form-group">
          <label className="qp-label">Meta description</label>
          <textarea className="qp-textarea" value={v.metaDescription ?? ""} maxLength={300}
            onChange={(e) => set({ metaDescription: e.target.value })}
            placeholder="Mô tả ngắn hiển thị dưới tiêu đề (≈ 160 ký tự)" />
        </div>
        <div className="qp-acc-grid2">
          <div className="qp-form-group">
            <label className="qp-label">Keywords (cách nhau dấu phẩy)</label>
            <input className="qp-input" value={kw}
              onChange={(e) => {
                setKw(e.target.value);
                set({ keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) });
              }}
              placeholder="VD: trường học, Quỳnh Phụ, THPT" />
          </div>
          <div className="qp-form-group">
            <label className="qp-label">OG image URL</label>
            <input className="qp-input" value={v.ogImage ?? ""}
              onChange={(e) => set({ ogImage: e.target.value })}
              placeholder="Ảnh chia sẻ mạng xã hội (tuỳ chọn)" />
          </div>
        </div>
        <label className="qp-check">
          <input type="checkbox" checked={!!v.noindex} onChange={(e) => set({ noindex: e.target.checked })} />{" "}
          Ẩn khỏi công cụ tìm kiếm (noindex)
        </label>
      </div>
    </details>
  );
}
