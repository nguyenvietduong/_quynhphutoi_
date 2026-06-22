"use client";

import { useMemo, useState } from "react";
import type { UserRow } from "@/lib/users";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import { formatDate } from "@/lib/datetime";
import { useToast } from "@/components/common/Toast";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "",        label: "Tất cả" },
  { value: "active",  label: "Hoạt động" },
  { value: "warned",  label: "Cảnh báo" },
  { value: "banned",  label: "Đã khóa" },
];

export function UserManager({ initial, me }: { initial: UserRow[]; me: string }) {
  const [rows, setRows] = useState<UserRow[]>(initial);
  const [q, setQ]             = useState("");
  const [fRole, setFRole]     = useState("");
  const [fStatus, setFStatus] = useState("");
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (fRole && r.role !== fRole) return false;
      if (fStatus === "banned" && !r.banned) return false;
      if (fStatus === "warned" && (r.banned || r.warnCount === 0)) return false;
      if (fStatus === "active" && (r.banned || r.warnCount > 0)) return false;
      if (kw && !r.email.toLowerCase().includes(kw) && !r.name.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [rows, q, fRole, fStatus]);

  const pg = usePagination(filtered, 20);

  // Đếm cho tabs
  const countAll     = rows.length;
  const countActive  = rows.filter((r) => !r.banned && r.warnCount === 0).length;
  const countWarned  = rows.filter((r) => !r.banned && r.warnCount > 0).length;
  const countBanned  = rows.filter((r) => r.banned).length;

  function tabCount(value: string) {
    if (value === "active")  return countActive;
    if (value === "warned")  return countWarned;
    if (value === "banned")  return countBanned;
    return countAll;
  }

  async function patch(r: UserRow, body: Record<string, unknown>, optimistic: Partial<UserRow>) {
    setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, ...optimistic } : x)));
    const res = await fetch(`/api/admin/users/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Không cập nhật được.");
      setRows((cur) => cur.map((x) => (x.id === r.id ? r : x)));
      return null;
    }
    return res.json().catch(() => ({}));
  }

  function changeRole(r: UserRow, next: UserRow["role"]) {
    if (next === r.role) return;
    if (r.id === me) { toast.error("Không thể tự đổi quyền của chính mình."); return; }
    if (next === "admin" && !confirm(`Cấp quyền ADMIN (toàn quyền) cho ${r.email}?`)) return;
    patch(r, { role: next }, { role: next });
  }

  function toggleVerified(r: UserRow) {
    patch(r, { verified: !r.verified }, { verified: !r.verified });
  }

  function toggleBanned(r: UserRow) {
    if (r.id === me) { toast.error("Không thể tự khóa tài khoản của mình."); return; }
    const next = !r.banned;
    if (next && !confirm(`Khóa tài khoản ${r.email}? Người dùng sẽ không đăng nhập được.`)) return;
    patch(r, { banned: next }, { banned: next });
    toast.success(next ? `Đã khóa ${r.email}.` : `Đã mở khóa ${r.email}.`);
  }

  async function warn(r: UserRow) {
    if (r.id === me) { toast.error("Không thể tự cảnh báo chính mình."); return; }
    const d = await patch(r, { warn: "add" }, { warnCount: r.warnCount + 1 });
    if (d?.warnCount !== undefined) {
      setRows((cur) => cur.map((x) =>
        x.id === r.id ? { ...x, warnCount: d.warnCount, banned: d.autoBanned ? true : x.banned } : x
      ));
      if (d.autoBanned) toast.error(`Tài khoản ${r.email} đã bị tự động khóa sau ${d.warnCount} lần cảnh báo.`);
      else toast.success(`Đã gửi cảnh báo lần ${d.warnCount} cho ${r.email}.`);
    }
  }

  async function clearWarn(r: UserRow) {
    const d = await patch(r, { warn: "clear" }, { warnCount: 0 });
    if (d?.warnCount === 0) toast.success(`Đã xoá cảnh báo của ${r.email}.`);
  }

  async function remove(r: UserRow) {
    if (r.id === me) { toast.error("Không thể tự xoá tài khoản của mình."); return; }
    if (!confirm(`Xoá tài khoản ${r.email}? Hành động không thể hoàn tác.`)) return;
    const res = await fetch(`/api/admin/users/${r.id}`, { method: "DELETE" });
    if (res.ok) setRows((cur) => cur.filter((x) => x.id !== r.id));
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Không xoá được."); }
  }

  return (
    <div className="qp-acc-page">

      {/* Status tabs */}
      <div className="qp-tabbar" style={{ marginBottom: 0 }}>
        {STATUS_TABS.map((t) => {
          const count = tabCount(t.value);
          const isWarned = t.value === "warned";
          const isBanned = t.value === "banned";
          return (
            <button
              key={t.value}
              type="button"
              className={`qp-tabbar__btn${fStatus === t.value ? " is-active" : ""}`}
              onClick={() => { setFStatus(t.value); pg.setPage(1); }}
            >
              {t.label}
              <span
                className="qp-admin-nav__count"
                style={
                  isBanned && countBanned > 0
                    ? { background: "var(--color-error)" }
                    : isWarned && countWarned > 0
                    ? { background: "var(--color-warning)" }
                    : { background: "var(--color-gray-border)", color: "var(--color-gray-text)" }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="qp-admin-toolbar" style={{ marginTop: "var(--space-4)" }}>
        <input
          className="qp-input qp-admin-toolbar__search"
          placeholder="Tìm theo email / tên…"
          value={q}
          onChange={(e) => { setQ(e.target.value); pg.setPage(1); }}
        />
        <select
          className="qp-select"
          style={{ maxWidth: 200 }}
          value={fRole}
          onChange={(e) => { setFRole(e.target.value); pg.setPage(1); }}
        >
          <option value="">Tất cả vai trò</option>
          <option value="admin">Admin</option>
          <option value="editor">Biên tập viên</option>
          <option value="user">Người dùng</option>
        </select>
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        <span className="type-body-small text-muted">{filtered.length} tài khoản</span>
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty">
          <div className="qp-empty__title">Không có người dùng nào</div>
        </div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table">
            <thead>
              <tr>
                <th>Email / Tên</th>
                <th>Trạng thái</th>
                <th>Cảnh báo</th>
                <th>Vai trò</th>
                <th>Xác minh</th>
                <th>Ngày tạo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.id} style={r.banned ? { opacity: .6 } : undefined}>

                  {/* Email + Tên */}
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--color-navy)" }}>
                      {r.email}
                      {r.id === me && <> <span className="qp-badge-g4">Bạn</span></>}
                    </div>
                    <div className="type-body-small text-muted">{r.name}</div>
                  </td>

                  {/* Trạng thái */}
                  <td>
                    {r.banned ? (
                      <span className="qp-usr-status qp-usr-status--banned">
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M3.5 3.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Đã khóa
                      </span>
                    ) : r.warnCount > 0 ? (
                      <span className="qp-usr-status qp-usr-status--warned">
                        <svg width="11" height="10" viewBox="0 0 22 20" fill="none" aria-hidden>
                          <path d="M11 2L2 18h18L11 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                          <path d="M11 9v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                          <circle cx="11" cy="15.5" r="1" fill="currentColor"/>
                        </svg>
                        Cảnh báo
                      </span>
                    ) : (
                      <span className="qp-usr-status qp-usr-status--active">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                          <circle cx="4" cy="4" r="4" fill="currentColor"/>
                        </svg>
                        Hoạt động
                      </span>
                    )}
                  </td>

                  {/* Số cảnh báo */}
                  <td>
                    {r.warnCount > 0 ? (
                      <span
                        className="qp-admin-nav__count"
                        style={{ background: "var(--color-warning)", fontSize: 11 }}
                        title={`${r.warnCount} lần cảnh báo`}
                      >
                        {r.warnCount}
                      </span>
                    ) : (
                      <span className="type-body-small text-muted">—</span>
                    )}
                  </td>

                  {/* Vai trò */}
                  <td>
                    <select
                      className="qp-select"
                      style={{ maxWidth: 170 }}
                      value={r.role}
                      disabled={r.id === me}
                      onChange={(e) => changeRole(r, e.target.value as UserRow["role"])}
                      title={r.id === me ? "Không thể tự đổi quyền của mình" : "Đổi vai trò"}
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Biên tập viên</option>
                      <option value="user">Người dùng</option>
                    </select>
                  </td>

                  {/* Xác minh */}
                  <td>
                    <button
                      type="button"
                      className={`qp-acc-badge is-${r.verified ? "active" : "pending"}`}
                      style={{ border: 0, cursor: "pointer" }}
                      onClick={() => toggleVerified(r)}
                      title="Bấm để đổi trạng thái xác minh"
                    >
                      {r.verified ? "Đã xác minh" : "Chưa"}
                    </button>
                  </td>

                  {/* Ngày tạo */}
                  <td className="type-body-small text-muted">{formatDate(r.createdAt)}</td>

                  {/* Actions */}
                  <td className="qp-admin-actions">
                    <RowActions actions={[
                      { value: "warn",    label: "Cảnh báo (+1)",   hidden: r.id === me || r.banned, run: () => warn(r) },
                      { value: "unwarn",  label: "Xoá cảnh báo",    hidden: r.id === me || r.warnCount === 0, run: () => clearWarn(r) },
                      { value: "ban",     label: r.banned ? "Mở khóa" : "Khóa tài khoản", hidden: r.id === me, run: () => toggleBanned(r) },
                      { value: "delete",  label: "Xoá",             hidden: r.id === me, run: () => remove(r) },
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
