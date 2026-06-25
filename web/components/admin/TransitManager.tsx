"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TransitRow } from "@/lib/transit";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { hasPerm, type PermLevel } from "@/lib/perm";

type TypeOption = { slug: string; name: string };

export function TransitManager({ initial, typeOptions, perm = "full" }: {
  initial: TransitRow[];
  typeOptions: TypeOption[];
  perm?: PermLevel;
}) {
  const canEdit = hasPerm(perm, "edit");
  const router = useRouter();
  const typeLabel = (s: string) => typeOptions.find((x) => x.slug === s)?.name ?? s;
  const [rows, setRows] = useState<TransitRow[]>(initial);
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!fType || r.type === fType) &&
      (!kw || r.name.toLowerCase().includes(kw) || r.origin.toLowerCase().includes(kw) || r.destination.toLowerCase().includes(kw)));
  }, [rows, q, fType]);

  const pg = usePagination(filtered, 20);

  async function remove(r: TransitRow) {
    if (!confirm(`Xoá "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/giao-thong/${r.slug}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.slug !== r.slug));
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-admin-toolbar">
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm theo tên / điểm đầu / điểm cuối…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="qp-select" style={{ maxWidth: 200 }} value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">Tất cả loại tuyến</option>
          {typeOptions.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
        </select>
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        {canEdit && <Link href="/admin/giao-thong/them" className="qp-btn-primary">+ Thêm tuyến</Link>}
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không có tuyến nào</div><p className="type-body-small">Bấm "Thêm tuyến" để tạo mới.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Tên</th><th>Loại</th><th>Lộ trình</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td><b className="qp-clip" title={r.name}>{r.name}</b>{r.operator ? <span className="qp-clip--sm type-body-small text-muted">{r.operator}</span> : null}</td>
                  <td>{typeLabel(r.type)}</td>
                  <td>{r.origin} → {r.destination}</td>
                  <td><span className={`qp-acc-badge is-${r.active ? "active" : "hidden"}`}>{r.active ? "Hiện" : "Ẩn"}</span></td>
                  <td className="qp-admin-actions">
                    <RowActions actions={[
                      { value: "edit", label: "Sửa", hidden: !canEdit, run: () => router.push(`/admin/giao-thong/${r.slug}/sua`) },
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
