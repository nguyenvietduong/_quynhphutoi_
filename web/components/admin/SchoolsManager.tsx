"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WARDS } from "@/lib/wards";
import type { SchoolRow } from "@/lib/schools";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { FilterSelect, type FilterOption } from "@/components/admin/FilterSelect";
import { RowActions } from "@/components/admin/RowActions";
import { useToast } from "@/components/common/Toast";
import { hasPerm, type PermLevel } from "@/lib/perm";

type CatOption = { slug: string; name: string };
const wardName = (s: string) => WARDS.find((w) => w.slug === s)?.name ?? s;

export function SchoolsManager({
  initial,
  levelOptions,
  typeOptions,
  perm = "full",
}: {
  initial: SchoolRow[];
  levelOptions: CatOption[];
  typeOptions: CatOption[];
  perm?: PermLevel;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const canEdit = hasPerm(perm, "edit");

  const levelLabelMap = useMemo(() => new Map(levelOptions.map((o) => [o.slug, o.name])), [levelOptions]);
  const typeLabelMap  = useMemo(() => new Map(typeOptions.map((o) => [o.slug, o.name])), [typeOptions]);
  const levelLabel = (s: string) => levelLabelMap.get(s) ?? s;
  const typeLabel  = (s: string) => typeLabelMap.get(s) ?? s;

  const [rows, setRows] = useState<SchoolRow[]>(initial);
  const [q, setQ] = useState("");
  const [fLevel, setFLevel] = useState("");

  const levelFilterOpts: FilterOption[] = levelOptions.map((o) => ({ value: o.slug, label: o.name }));

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!fLevel || r.level === fLevel) &&
      (!kw || r.name.toLowerCase().includes(kw) || wardName(r.wardSlug).toLowerCase().includes(kw)),
    );
  }, [rows, q, fLevel]);

  const pg = usePagination(filtered, 20);

  async function remove(r: SchoolRow) {
    if (!confirm(`Xoá "${r.name}"?`)) return;
    const res = await fetch(`/api/admin/truong-hoc/${r.slug}`, { method: "DELETE" });
    if (res.ok) {
      setRows((cur) => cur.filter((x) => x.slug !== r.slug));
      toast.success("Đã xoá trường học.");
    } else {
      toast.error("Xoá thất bại.");
    }
  }

  return (
    <div className="qp-acc-page">
      <div className="qp-admin-toolbar">
        <input
          className="qp-input qp-admin-toolbar__search"
          placeholder="Tìm theo tên / xã..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <FilterSelect
          options={levelFilterOpts}
          value={fLevel}
          onChange={setFLevel}
          placeholder="Tất cả cấp học"
          showSearch={false}
        />
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        {canEdit && (
          <Link href="/admin/truong-hoc/them" className="qp-btn-primary">
            + Thêm trường
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty">
          <div className="qp-empty__title">Không có trường nào</div>
          <p className="type-body-small">
            {q || fLevel ? "Thử xoá bộ lọc hoặc thay đổi từ khoá." : "Bấm \"+ Thêm trường\" để tạo mới."}
          </p>
        </div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead>
              <tr>
                <th>Tên trường</th>
                <th>Cấp</th>
                <th>Loại hình</th>
                <th>Xã / TT</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td>
                    <b className="qp-clip" title={r.name}>{r.name}</b>
                    {r.principal && <span className="qp-clip--sm type-body-small text-muted">HT: {r.principal}</span>}
                  </td>
                  <td>{levelLabel(r.level)}</td>
                  <td>{typeLabel(r.type)}</td>
                  <td>{wardName(r.wardSlug)}</td>
                  <td>
                    <span className={`qp-acc-badge is-${r.active ? "active" : "hidden"}`}>
                      {r.active ? "Hiện" : "Ẩn"}
                    </span>
                  </td>
                  <td className="qp-admin-actions">
                    <RowActions
                      actions={[
                        { value: "edit",   label: "Sửa", hidden: !canEdit, run: () => router.push(`/admin/truong-hoc/${r.slug}/sua`) },
                        { value: "delete", label: "Xoá", hidden: !canEdit, run: () => remove(r) },
                      ]}
                    />
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
