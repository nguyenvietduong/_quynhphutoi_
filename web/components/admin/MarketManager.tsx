"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WARDS } from "@/lib/wards";
import type { MarketRow } from "@/lib/market";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { hasPerm, type PermLevel } from "@/lib/perm";

export type CategoryOption = { slug: string; name: string };
const wardName = (s: string) => WARDS.find((w) => w.slug === s)?.name ?? s;

export function MarketManager({ initial, categoryOptions, perm = "full" }: {
  initial: MarketRow[];
  categoryOptions: CategoryOption[];
  perm?: PermLevel;
}) {
  const canEdit = hasPerm(perm, "edit");
  const router = useRouter();
  const [rows, setRows] = useState<MarketRow[]>(initial);
  const [q, setQ] = useState("");
  const [fCategory, setFCategory] = useState("");

  const categoryName = (s: string) => categoryOptions.find((c) => c.slug === s)?.name ?? s;

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!fCategory || r.category === fCategory) &&
      (!kw || r.name.toLowerCase().includes(kw) || wardName(r.wardSlug).toLowerCase().includes(kw)));
  }, [rows, q, fCategory]);

  const pg = usePagination(filtered, 20);

  async function remove(r: MarketRow) {
    if (!confirm(`Xoá "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/cho/${r.slug}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.slug !== r.slug));
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-admin-toolbar">
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm theo tên / xã…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="qp-select" style={{ maxWidth: 200 }} value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
          <option value="">Tất cả danh mục</option>
          {categoryOptions.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        {canEdit && <Link href="/admin/cho/them" className="qp-btn-primary">+ Thêm mục</Link>}
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không có mục nào</div><p className="type-body-small">Bấm "Thêm mục" để tạo mới.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Tên</th><th>Danh mục</th><th>Xã/TT</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td><b className="qp-clip" title={r.name}>{r.name}</b>{r.contactName ? <span className="qp-clip--sm type-body-small text-muted">LH: {r.contactName}</span> : null}</td>
                  <td>{categoryName(r.category)}</td>
                  <td>{wardName(r.wardSlug)}</td>
                  <td><span className={`qp-acc-badge is-${r.active ? "active" : "hidden"}`}>{r.active ? "Hiện" : "Ẩn"}</span></td>
                  <td className="qp-admin-actions">
                    <RowActions actions={[
                      { value: "edit", label: "Sửa", hidden: !canEdit, run: () => router.push(`/admin/cho/${r.slug}/sua`) },
                      { value: "delete", label: "Xoá", hidden: !canEdit, run: () => remove(r) },
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
