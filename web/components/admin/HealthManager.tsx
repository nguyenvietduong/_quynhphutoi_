"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WARDS } from "@/lib/wards";
import type { HealthRow } from "@/lib/health";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { hasPerm, type PermLevel } from "@/lib/perm";

type Option = { slug: string; name: string };
const wardName = (s: string) => WARDS.find((w) => w.slug === s)?.name ?? s;

export function HealthManager({ initial, typeOptions, ownershipOptions, perm = "full" }: {
  initial: HealthRow[];
  typeOptions: Option[];
  ownershipOptions: Option[];
  perm?: PermLevel;
}) {
  const canEdit = hasPerm(perm, "edit");
  const router = useRouter();
  const [rows, setRows] = useState<HealthRow[]>(initial);
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");

  const typeLabel = (s: string) => typeOptions.find((x) => x.slug === s)?.name ?? s;
  const ownershipLabel = (s: string) => ownershipOptions.find((x) => x.slug === s)?.name ?? s;

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!fType || r.type === fType) &&
      (!kw || r.name.toLowerCase().includes(kw) || wardName(r.wardSlug).toLowerCase().includes(kw)));
  }, [rows, q, fType]);

  const pg = usePagination(filtered, 20);

  async function remove(r: HealthRow) {
    if (!confirm(`Xoá "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/y-te/${r.slug}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.slug !== r.slug));
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-admin-toolbar">
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm theo tên / xã…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="qp-select" style={{ maxWidth: 200 }} value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">Tất cả loại</option>
          {typeOptions.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
        </select>
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        {canEdit && <Link href="/admin/y-te/them" className="qp-btn-primary">+ Thêm cơ sở</Link>}
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không có cơ sở nào</div><p className="type-body-small">Bấm "Thêm cơ sở" để tạo mới.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Tên cơ sở</th><th>Loại</th><th>Sở hữu</th><th>Xã/TT</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td><b className="qp-clip" title={r.name}>{r.name}</b>{r.director ? <span className="qp-clip--sm type-body-small text-muted">GĐ: {r.director}</span> : null}</td>
                  <td>{typeLabel(r.type)}</td>
                  <td>{ownershipLabel(r.ownership)}</td>
                  <td>{wardName(r.wardSlug)}</td>
                  <td><span className={`qp-acc-badge is-${r.active ? "active" : "hidden"}`}>{r.active ? "Hiện" : "Ẩn"}</span></td>
                  <td className="qp-admin-actions">
                    <RowActions actions={[
                      { value: "edit", label: "Sửa", hidden: !canEdit, run: () => router.push(`/admin/y-te/${r.slug}/sua`) },
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
