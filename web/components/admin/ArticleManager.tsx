"use client";

// Quản trị Tin tức: bảng danh sách + duyệt bài. Tạo/sửa bài → trang riêng /admin/tin-tuc/bai-viet/*
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArticleRow } from "@/lib/articles";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { ExternalNewsImport } from "@/components/admin/ExternalNewsImport";
import { FilterSelect } from "@/components/admin/FilterSelect";
import { useToast } from "@/components/common/Toast";
import { hasPerm, type PermLevel } from "@/lib/perm";

const STATUS_TABS = [
  { value: "",          label: "Tất cả"       },
  { value: "pending",   label: "Chờ duyệt", warn: true },
  { value: "published", label: "Đã xuất bản"  },
  { value: "draft",     label: "Nháp"          },
] as const;

export function ArticleManager({ initial, externalEnabled, perm = "full" }: { initial: ArticleRow[]; externalEnabled?: boolean; categories?: string[]; perm?: PermLevel }) {
  const canEdit = hasPerm(perm, "edit");
  const canFull = hasPerm(perm, "full");
  const router = useRouter();
  const [rows, setRows] = useState<ArticleRow[]>(initial);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState<string>("published");
  const [fCategory, setFCategory] = useState("");
  const [fScope, setFScope] = useState("trong-xa");
  const [fFeatured, setFFeatured] = useState("");
  const [fFlags, setFFlags] = useState("");
  const { toast } = useToast();

  // Đếm theo từng tab (luôn tính trên toàn bộ rows, không bị ảnh hưởng bởi filter phụ)
  const counts = useMemo(() => ({
    "":          rows.length,
    pending:     rows.filter((r) => r.pending).length,
    published:   rows.filter((r) => !r.pending && r.status === "published").length,
    draft:       rows.filter((r) => !r.pending && r.status === "draft").length,
  }), [rows]);

  // Danh sách chuyên mục lấy từ dữ liệu thực tế
  const uniqueCategories = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => { if (r.categorySlug && r.category) map.set(r.categorySlug, r.category); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [rows]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (fStatus && !(fStatus === "pending" ? r.pending : (!r.pending && r.status === fStatus))) return false;
      if (fCategory && r.categorySlug !== fCategory) return false;
      if (fScope && r.scope !== fScope) return false;
      if (fFeatured === "yes" && !r.featured) return false;
      if (fFeatured === "no" && r.featured) return false;
      if (fFlags === "has" && !r.flags?.length) return false;
      if (kw && !r.title.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [rows, q, fStatus, fCategory, fScope, fFeatured, fFlags]);

  // fScope là bắt buộc (luôn có giá trị), không tính vào "bộ lọc phụ" để tránh hiện nút xoá
  const hasSecondaryFilter = !!(fCategory || fFeatured || fFlags);

  function clearSecondaryFilters() {
    setFCategory(""); setFFeatured(""); setFFlags("");
  }

  async function approve(r: ArticleRow) {
    const res = await fetch(`/api/admin/articles/${r.slug}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved: true }),
    });
    if (res.ok) {
      setRows((cur) => cur.map((x) => (x.slug === r.slug ? { ...x, approved: true, pending: false, status: "published" } : x)));
      toast.success("Đã duyệt bài viết.");
    } else { toast.error("Duyệt thất bại."); }
  }

  const pg = usePagination(filtered, 20);

  async function remove(r: ArticleRow) {
    if (!confirm(`Xoá bài "${r.title}"?`)) return;
    const res = await fetch(`/api/admin/articles/${r.slug}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.slug !== r.slug));
  }

  return (
    <div className="qp-acc-page">

      {/* Hàng 1: tìm kiếm + nút hành động */}
      <div className="qp-admin-toolbar">
        <input
          className="qp-input qp-admin-toolbar__search"
          placeholder="Tìm theo tiêu đề…"
          value={q} onChange={(e) => setQ(e.target.value)}
        />
        <span className="qp-admin-toolbar__spacer" />
        {externalEnabled && canEdit && (
          <ExternalNewsImport onImported={(items) => setRows((cur) => [...items, ...cur])} />
        )}
        {canEdit && (
          <button type="button" className="qp-btn-primary" onClick={() => router.push("/admin/tin-tuc/bai-viet/moi")}>
            + Viết bài mới
          </button>
        )}
      </div>

      {/* Hàng 2: tabs trạng thái có đếm */}
      <div className="qp-tabs" style={{ marginBottom: "var(--space-3)" }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`qp-tab${fStatus === t.value ? " is-active" : ""}${"warn" in t && t.warn ? " qp-tab--pending" : ""}`}
            onClick={() => setFStatus(t.value)}
          >
            {t.label}
            <span className="qp-tab__count">{counts[t.value]}</span>
          </button>
        ))}
      </div>

      {/* Hàng 3: filter phụ dạng Select2 + page size */}
      <div className="qp-filter-strip">
        <FilterSelect
          placeholder="Tất cả chuyên mục"
          value={fCategory}
          onChange={setFCategory}
          options={uniqueCategories.map(([slug, name]) => ({ value: slug, label: name }))}
        />
        <div className="qp-scope-toggle">
          {(["trong-xa", "ngoai-xa"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`qp-scope-toggle__btn${fScope === v ? " is-active" : ""}`}
              onClick={() => setFScope(v)}
            >
              {v === "trong-xa" ? "Trong xã" : "Ngoài xã"}
            </button>
          ))}
        </div>
        <FilterSelect
          placeholder="Mức độ nổi bật"
          value={fFeatured}
          onChange={setFFeatured}
          showSearch={false}
          options={[
            { value: "yes", label: "Nổi bật" },
            { value: "no",  label: "Không nổi bật" },
          ]}
        />
        <FilterSelect
          placeholder="Kiểm duyệt"
          value={fFlags}
          onChange={setFFlags}
          showSearch={false}
          options={[{ value: "has", label: "Có cờ vi phạm" }]}
        />

        {hasSecondaryFilter && (
          <button type="button" className="qp-filter-strip__clear" onClick={clearSecondaryFilters}>
            ✕ Xoá bộ lọc
          </button>
        )}

        <span className="qp-filter-strip__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty">
          <div className="qp-empty__title">Không có bài viết</div>
          <p className="type-body-small">
            {hasSecondaryFilter || q
              ? "Thử xoá bộ lọc hoặc thay đổi từ khoá tìm kiếm."
              : "Bấm \"Viết bài mới\" để bắt đầu."}
          </p>
        </div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Chuyên mục</th>
                <th>Trạng thái</th>
                <th>Lượt xem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug} style={r.featured ? { outline: "1px solid var(--color-yellow)", outlineOffset: -1, background: "#FFFBEB" } : undefined}>
                  <td style={{ maxWidth: 400 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      {r.featured && <span style={{ flexShrink: 0, color: "var(--color-warning)", fontSize: 14 }} aria-label="Nổi bật">★</span>}
                      <b className="qp-clip" title={r.title} style={{ flex: 1, minWidth: 0 }}>{r.title}</b>
                    </div>
                    {r.pending && r.postedByName
                      ? <div className="type-body-small text-muted">Người gửi: {r.postedByName}</div>
                      : null}
                    {r.flags?.length ? (
                      <div className="type-body-small" style={{ color: "var(--color-danger, #c0392b)", marginTop: 2 }}>
                        ⚠️ Cần kiểm duyệt: {r.flags.join("; ")}
                      </div>
                    ) : null}
                  </td>
                  <td>{r.category}</td>
                  <td>
                    {r.pending
                      ? <span className="qp-acc-badge is-pending">Chờ duyệt</span>
                      : <span className={`qp-acc-badge is-${r.status === "published" ? "active" : "pending"}`}>
                          {r.status === "published" ? "Đã xuất bản" : "Nháp"}
                        </span>}
                  </td>
                  <td>{r.views}</td>
                  <td className="qp-admin-actions">
                    <RowActions actions={[
                      { value: "approve", label: "Duyệt", hidden: !r.pending || !canFull, run: () => approve(r) },
                      { value: "view", label: "Xem", hidden: r.status !== "published" || r.pending, run: () => window.open(`/tin-tuc/${r.slug}`, "_blank") },
                      { value: "edit", label: "Sửa", hidden: !canEdit, run: () => router.push(`/admin/tin-tuc/bai-viet/${r.slug}/sua`) },
                      { value: "delete", label: r.pending ? "Từ chối" : "Xoá", hidden: !canEdit, run: () => remove(r) },
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
