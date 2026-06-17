"use client";

// Quản trị Tin tức: bảng danh sách + duyệt bài. Tạo/sửa bài → trang riêng /admin/tin-tuc/bai-viet/*
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArticleRow } from "@/lib/articles";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { ExternalNewsImport } from "@/components/admin/ExternalNewsImport";
import { useToast } from "@/components/common/Toast";

export function ArticleManager({ initial, externalEnabled }: { initial: ArticleRow[]; externalEnabled?: boolean; categories?: string[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ArticleRow[]>(initial);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("published");
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!fStatus || (fStatus === "pending" ? r.pending : (!r.pending && r.status === fStatus))) &&
      (!kw || r.title.toLowerCase().includes(kw)));
  }, [rows, q, fStatus]);

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
      <div className="qp-admin-toolbar">
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm theo tiêu đề…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="qp-select" style={{ maxWidth: 200 }} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="published">Đã xuất bản</option>
          <option value="draft">Bản nháp</option>
        </select>
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        {externalEnabled && (
          <ExternalNewsImport onImported={(items) => setRows((cur) => [...items, ...cur])} />
        )}
        <button type="button" className="qp-btn-primary" onClick={() => router.push("/admin/tin-tuc/bai-viet/moi")}>
          + Viết bài mới
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Chưa có bài viết</div><p className="type-body-small">Bấm “Viết bài mới” để bắt đầu.</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead><tr><th>Tiêu đề</th><th>Chuyên mục</th><th>Trạng thái</th><th>Lượt xem</th><th></th></tr></thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.slug}>
                  <td>
                    <b className="qp-clip" title={r.title}>{r.title}</b>{r.featured ? <> <span className="qp-badge-g4">Nổi bật</span></> : null}
                    {r.pending && r.postedByName ? <div className="type-body-small text-muted">Người gửi: {r.postedByName}</div> : null}
                    {r.flags?.length ? (
                      <div className="type-body-small" style={{ color: "var(--color-danger, #c0392b)", marginTop: 2 }}>
                        ⚠️ Cần kiểm duyệt: {r.flags.join("; ")}
                      </div>
                    ) : null}
                  </td>
                  <td>{r.category}{r.scope === "ngoai-xa" ? <> <span className="qp-badge-g4">Ngoài xã</span></> : null}</td>
                  <td>
                    {r.pending
                      ? <span className="qp-acc-badge is-pending">Chờ duyệt</span>
                      : <span className={`qp-acc-badge is-${r.status === "published" ? "active" : "pending"}`}>{r.status === "published" ? "Đã xuất bản" : "Nháp"}</span>}
                  </td>
                  <td>{r.views}</td>
                  <td className="qp-admin-actions">
                    <RowActions actions={[
                      { value: "approve", label: "Duyệt", hidden: !r.pending, run: () => approve(r) },
                      { value: "view", label: "Xem", hidden: r.status !== "published" || r.pending, run: () => window.open(`/tin-tuc/${r.slug}`, "_blank") },
                      { value: "edit", label: "Sửa", run: () => router.push(`/admin/tin-tuc/bai-viet/${r.slug}/sua`) },
                      { value: "delete", label: r.pending ? "Từ chối" : "Xoá", run: () => remove(r) },
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
