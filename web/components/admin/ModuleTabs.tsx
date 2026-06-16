"use client";

// Khung tab dùng chung cho mỗi module gắn với 1 trang client:
//   [Danh sách ...] · [Quản lý trang] · [SEO]
// - "Danh sách": trình quản lý nội dung hiện có (truyền qua children). Bỏ qua nếu không có.
// - "Quản lý trang": cấu hình bố cục/hiển thị (truyền qua `manage`). Nếu trang chưa có
//   cấu hình riêng → hiện panel thông tin mặc định (nút Xem trang + ghi chú).
// - "SEO": override SEO riêng cho trang (PageSeoTab).
import { useState, type ReactNode } from "react";
import { PageSeoTab } from "@/components/admin/PageSeoTab";
import type { PageSeoOverride } from "@/lib/page-seo";

export function ModuleTabs({
  pageKey, pageLabel, listLabel, children, manage, seoInitial,
}: {
  pageKey: string;
  pageLabel: string;
  listLabel?: string;       // nhãn tab danh sách (vd "Danh sách bài viết"); bỏ qua = không có tab danh sách
  children?: ReactNode;     // trình quản lý nội dung
  manage?: ReactNode;       // nội dung tab "Quản lý trang"; trống = panel mặc định
  seoInitial: PageSeoOverride;
}) {
  const hasList = !!listLabel && !!children;
  const [tab, setTab] = useState<"list" | "manage" | "seo">(hasList ? "list" : "manage");

  return (
    <>
      <div className="qp-tabbar" role="tablist" aria-label={`Quản lý ${pageLabel}`}>
        {hasList && (
          <button type="button" role="tab" aria-selected={tab === "list"}
            className={`qp-tabbar__btn${tab === "list" ? " is-active" : ""}`} onClick={() => setTab("list")}>
            {listLabel}
          </button>
        )}
        <button type="button" role="tab" aria-selected={tab === "manage"}
          className={`qp-tabbar__btn${tab === "manage" ? " is-active" : ""}`} onClick={() => setTab("manage")}>
          Quản lý trang
        </button>
        <button type="button" role="tab" aria-selected={tab === "seo"}
          className={`qp-tabbar__btn${tab === "seo" ? " is-active" : ""}`} onClick={() => setTab("seo")}>
          SEO
        </button>
      </div>

      {hasList && tab === "list" && <div role="tabpanel">{children}</div>}

      {tab === "manage" && (
        <div role="tabpanel">
          {manage ?? (
            <div className="qp-acc-card">
              <div className="qp-acc-card__title" style={{ marginBottom: 8 }}>Hiển thị trang “{pageLabel}”</div>
              <p className="qp-admin-head__desc" style={{ marginTop: 0 }}>
                {hasList
                  ? "Nội dung của trang này được quản lý ở tab danh sách. Hiện chưa có tuỳ chọn hiển thị riêng cho trang."
                  : "Hiện chưa có tuỳ chọn hiển thị riêng cho trang này."}
              </p>
              <div className="qp-pagepanel__actions">
                <a className="qp-btn-outline" href={pageKey} target="_blank" rel="noopener noreferrer">↗ Xem trang</a>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "seo" && (
        <div role="tabpanel">
          <PageSeoTab pageKey={pageKey} initial={seoInitial} />
        </div>
      )}
    </>
  );
}
