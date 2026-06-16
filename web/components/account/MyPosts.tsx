"use client";

// Danh sách bài đăng của tôi — tab theo phân hệ + lọc nhanh "chờ duyệt".
import { useMemo, useState } from "react";
import Link from "next/link";
import { Pagination } from "@/components/common/Pagination";
import type { MyPost } from "@/lib/my-posts";
import { formatDate } from "@/lib/datetime";
import { cldUrl } from "@/lib/cloudinary-url";

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "tin-tuc", label: "Tin tức" },
  { key: "tim-do-roi", label: "Tìm đồ rơi" },
  { key: "viec-lam", label: "Việc làm" },
  { key: "mua-ban", label: "Mua bán" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const PAGE_SIZE = 8;

export function MyPosts({ items }: { items: MyPost[] }) {
  const [tab, setTab] = useState<TabKey>("all");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, "tin-tuc": 0, "tim-do-roi": 0, "viec-lam": 0, "mua-ban": 0 };
    for (const p of items) c[p.section]++;
    return c;
  }, [items]);

  const filtered = useMemo(
    () => items.filter((p) => (tab === "all" || p.section === tab) && (!pendingOnly || p.state === "pending")),
    [items, tab, pendingOnly],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pickTab = (k: TabKey) => { setTab(k); setPage(1); };
  const togglePending = (v: boolean) => { setPendingOnly(v); setPage(1); };

  return (
    <>
      <div className="qp-tabs" role="tablist" aria-label="Lọc theo phân hệ">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
            className={`qp-tab${tab === t.key ? " is-active" : ""}`} onClick={() => pickTab(t.key)}>
            {t.label} <span className="qp-tab__count">{counts[t.key]}</span>
          </button>
        ))}
        <label className="qp-acc-pending-toggle">
          <input type="checkbox" checked={pendingOnly} onChange={(e) => togglePending(e.target.checked)} />
          Chỉ hiện chờ duyệt
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty">
          <div className="qp-empty__title">Không có bài đăng nào</div>
          <p className="type-body-small">
            {pendingOnly ? "Bạn không có bài đang chờ duyệt." : <>Đăng tin tại <Link href="/tin-tuc">Tin tức</Link>, <Link href="/tim-do-roi">Tìm đồ rơi</Link>, <Link href="/viec-lam">Việc làm</Link> hoặc <Link href="/mua-ban">Mua bán</Link>.</>}
          </p>
        </div>
      ) : (
        <>
          <ul className="qp-acc-list">
            {pageItems.map((p) => (
              <li key={`${p.section}-${p.slug}`} className={`qp-acc-list__row${p.state === "pending" ? " is-pending" : ""}`}>
                <Link href={p.href} className="qp-acc-list__media" aria-hidden tabIndex={-1}>
                  {p.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={cldUrl(p.image, { w: 160 })} alt="" loading="lazy" />
                    : <span className="qp-acc-list__ph">{p.sectionLabel[0]}</span>}
                </Link>
                <div className="qp-acc-list__main">
                  <Link href={p.href} className="qp-acc-list__title">{p.title}</Link>
                  <div className="qp-acc-list__meta">
                    <span className="qp-tag-cat">{p.sectionLabel}</span>
                    <span className={`qp-acc-badge is-${p.state}`}>{p.statusLabel}</span>
                    <span className="qp-acc-list__date">{formatDate(p.createdAt)} · {p.views} lượt xem</span>
                  </div>
                </div>
                <Link href={p.href} className="qp-acc-list__view">Xem →</Link>
              </li>
            ))}
          </ul>

          <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}
