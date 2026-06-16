"use client";

// Khu quản trị Tin tức gồm 2 tab: "Cấu hình trang" (bố cục trang công khai) và
// "Danh sách bài viết" (CRUD). Tách tab để 2 khối không xếp chồng dài trên 1 trang.
import { useState } from "react";
import { ArticleManager } from "@/components/admin/ArticleManager";
import { NewsPageManager } from "@/components/admin/NewsPageManager";
import type { ArticleRow } from "@/lib/articles";
import type { NewsPageConfig } from "@/lib/news-page";

type Tab = "config" | "list";

export function ArticlesAdmin({ rows, newsConfig, initialTitles, externalEnabled }: {
  rows: ArticleRow[];
  newsConfig: NewsPageConfig;
  initialTitles: Record<string, string>;
  externalEnabled?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("list");

  return (
    <>
      <div className="qp-tabbar" role="tablist" aria-label="Quản trị tin tức">
        <button type="button" role="tab" aria-selected={tab === "list"}
          className={`qp-tabbar__btn${tab === "list" ? " is-active" : ""}`} onClick={() => setTab("list")}>
          Danh sách bài viết
        </button>
        <button type="button" role="tab" aria-selected={tab === "config"}
          className={`qp-tabbar__btn${tab === "config" ? " is-active" : ""}`} onClick={() => setTab("config")}>
          Cấu hình trang
        </button>
      </div>

      {tab === "list" && (
        <div role="tabpanel">
          <ArticleManager initial={rows} externalEnabled={externalEnabled} />
        </div>
      )}

      {tab === "config" && (
        <div role="tabpanel">
          <p className="qp-admin-head__desc" style={{ marginBottom: 16 }}>
            Chọn cách hiển thị vùng nổi bật và khối “Đọc nhiều” trên trang Tin tức công khai: tự lấy mới nhất / theo lượt xem,
            hoặc chọn thủ công các bài cụ thể. Khối “Tất cả tin tức” bên dưới luôn hiển thị đầy đủ mọi bài đã xuất bản.
          </p>
          <NewsPageManager initialConfig={newsConfig} initialTitles={initialTitles} />
        </div>
      )}
    </>
  );
}
