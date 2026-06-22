"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/components/common/Toast";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { FilterSelect } from "@/components/admin/FilterSelect";

/* ─── Types ─────────────────────────────────────────────── */
type Audience = "all" | "admin" | "staff" | "emails";
type Status   = "ok" | "off";

type BroadcastRow = {
  _id: string;
  title: string;
  href: string;
  audience: Audience | null;
  emails: string[];
  status: Status;
  actorName: string;
  sentCount: number | null;
  createdAt: string;
  sentAt: string | null;
  legacy: boolean;
};

type ReceivedItem = {
  id: string;
  type: string;
  title: string;
  href: string;
  actorName: string | null;
  read: boolean;
  createdAt: string;
};

/* ─── Constants ──────────────────────────────────────────── */
const AUDIENCE_OPTS: { value: Audience; label: string; desc: string; pill: string }[] = [
  { value: "all",    label: "Tất cả",       desc: "Toàn bộ tài khoản đã đăng ký",               pill: "full" },
  { value: "staff",  label: "Ban quản trị", desc: "Admin + Editor — hiện ticker trên topbar",    pill: "edit" },
  { value: "admin",  label: "Chỉ Admin",    desc: "Chỉ tài khoản có vai trò Admin",              pill: "view" },
  { value: "emails", label: "Email cụ thể", desc: "Chỉ những địa chỉ email được nhập bên dưới", pill: "view" },
];
const AUDIENCE_LABELS: Record<Audience, string> = {
  all: "Tất cả", staff: "Ban quản trị", admin: "Chỉ Admin", emails: "Email cụ thể",
};

const TYPE_ICON: Record<string, string> = {
  post_pending:  "📝",
  post_approved: "✅",
  post_rejected: "❌",
  comment:       "💬",
  like:          "❤️",
  announcement:  "📢",
};
const TYPE_LABEL: Record<string, string> = {
  post_pending:  "Chờ duyệt",
  post_approved: "Được duyệt",
  post_rejected: "Bị từ chối",
  comment:       "Bình luận",
  like:          "Lượt thích",
  announcement:  "Thông báo",
};

function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)    return "vừa xong";
  if (sec < 3600)  return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  return `${Math.floor(sec / 86400)} ngày trước`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ═══════════════════════════════════════════════════════════
   Root — tab switcher
═══════════════════════════════════════════════════════════ */
type Tab = "received" | "send";

export function NotifyComposer() {
  const [tab, setTab] = useState<Tab>("received");
  return (
    <>
      <div className="qp-tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`qp-tab${tab === "received" ? " is-active" : ""}`}
          onClick={() => setTab("received")}
        >
          Thông báo
        </button>
        <button
          type="button"
          className={`qp-tab${tab === "send" ? " is-active" : ""}`}
          onClick={() => setTab("send")}
        >
          Gửi thông báo
        </button>
      </div>

      {tab === "received" ? <ReceivedTab /> : <SendTab />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   Tab 1 — Thông báo nhận được
═══════════════════════════════════════════════════════════ */
const READ_TABS = [
  { value: "",       label: "Tất cả"    },
  { value: "unread", label: "Chưa đọc" },
  { value: "read",   label: "Đã đọc"   },
] as const;

function ReceivedTab() {
  const [items, setItems]     = useState<ReceivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState("");
  const [fRead, setFRead]     = useState<"" | "unread" | "read">("");
  const [fType, setFType]     = useState("");
  const { toast } = useToast();

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=200");
      if (res.ok) {
        const d = await res.json();
        setItems(d.items ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    toast.success("Đã đánh dấu tất cả là đã đọc.");
  }

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  const counts = useMemo(() => ({
    "":      items.length,
    unread:  items.filter((n) => !n.read).length,
    read:    items.filter((n) => n.read).length,
  }), [items]);

  const typeOptions = useMemo(() => {
    const seen = new Set<string>();
    items.forEach((n) => seen.add(n.type));
    return [...seen].map((t) => ({ value: t, label: TYPE_LABEL[t] ?? t }));
  }, [items]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return items.filter((n) => {
      if (fRead === "unread" && n.read) return false;
      if (fRead === "read"   && !n.read) return false;
      if (fType && n.type !== fType) return false;
      if (kw && !n.title.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [items, fRead, fType, q]);

  const hasSecondaryFilter = !!(fType);
  const pg = usePagination(filtered, 20);

  return (
    <div className="qp-acc-page">

      {/* Hàng 1: tabs đọc/chưa đọc có đếm */}
      <div className="qp-tabs" style={{ marginBottom: "var(--space-3)" }}>
        {READ_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`qp-tab${fRead === t.value ? " is-active" : ""}`}
            onClick={() => { setFRead(t.value); pg.setPage(1); }}
          >
            {t.label}
            <span className="qp-tab__count">{counts[t.value]}</span>
          </button>
        ))}
      </div>

      {/* Hàng 2: search + filter phụ + page size */}
      <div className="qp-filter-strip">
        <input
          className="qp-input qp-admin-toolbar__search"
          placeholder="Tìm theo nội dung…"
          value={q}
          onChange={(e) => { setQ(e.target.value); pg.setPage(1); }}
        />
        <FilterSelect
          placeholder="Tất cả loại"
          value={fType}
          onChange={(v) => { setFType(v); pg.setPage(1); }}
          showSearch={false}
          options={typeOptions}
        />
        {hasSecondaryFilter && (
          <button type="button" className="qp-filter-strip__clear" onClick={() => { setFType(""); pg.setPage(1); }}>
            ✕ Xoá bộ lọc
          </button>
        )}
        <span className="qp-filter-strip__spacer" />
        {counts.unread > 0 && (
          <button type="button" className="qp-btn-outline" style={{ fontSize: 13, padding: "4px 12px", whiteSpace: "nowrap" }} onClick={markAllRead}>
            Đọc tất cả
          </button>
        )}
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
      </div>

      {loading ? (
        <p className="type-body-small text-muted">Đang tải…</p>
      ) : filtered.length === 0 ? (
        <div className="qp-empty">
          <div className="qp-empty__title">Không có thông báo nào</div>
          <p className="type-body-small">
            {hasSecondaryFilter || q
              ? "Thử xoá bộ lọc hoặc thay đổi từ khoá tìm kiếm."
              : "Khi có thông báo mới, chúng sẽ xuất hiện ở đây."}
          </p>
        </div>
      ) : (
        <div className="qp-table--wrap">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {pg.paged.map((n) => (
              <div
                key={n.id}
                className={`qp-admin-bell__item${n.read ? "" : " is-unread"}`}
                style={{ borderRadius: 8, padding: "10px 12px" }}
              >
                <Link
                  href={n.href}
                  className="qp-admin-bell__item"
                  style={{ border: "none", padding: 0, background: "none", flex: 1, display: "flex", gap: 10, alignItems: "flex-start" }}
                  onClick={() => { if (!n.read) markOne(n.id); }}
                >
                  <span className="qp-admin-bell__item-icon" style={{ fontSize: 18 }}>{TYPE_ICON[n.type] ?? "🔔"}</span>
                  <span className="qp-admin-bell__item-body">
                    <span className="qp-admin-bell__item-title">{n.title}</span>
                    <span className="qp-admin-bell__item-meta">
                      <span className="qp-acc-badge is-pending" style={{ fontSize: 11, padding: "1px 6px", marginRight: 6 }}>
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                      {n.actorName && <>{n.actorName} · </>}{timeAgo(n.createdAt)}
                    </span>
                  </span>
                </Link>
                {!n.read && (
                  <button
                    type="button"
                    className="qp-btn-outline"
                    style={{ fontSize: 12, padding: "2px 8px", flexShrink: 0 }}
                    onClick={() => markOne(n.id)}
                  >
                    Đã đọc
                  </button>
                )}
              </div>
            ))}
          </div>
          <Pagination page={pg.page} totalPages={pg.totalPages} onPage={pg.setPage} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Tab 2 — Gửi thông báo + lịch sử
═══════════════════════════════════════════════════════════ */
const SEND_STATUS_TABS = [
  { value: "",    label: "Tất cả"     },
  { value: "off", label: "Chờ gửi"   },
  { value: "ok",  label: "Đã gửi"    },
] as const;

function SendTab() {
  const [title, setTitle]         = useState("");
  const [href, setHref]           = useState("/thong-bao");
  const [audience, setAudience]   = useState<Audience>("all");
  const [emailsRaw, setEmailsRaw] = useState("");
  const [busy, setBusy]           = useState(false);
  const [list, setList]           = useState<BroadcastRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [q, setQ]                 = useState("");
  const [fStatus, setFStatus]     = useState<"" | "ok" | "off">("");
  const [fAudience, setFAudience] = useState("");
  const { toast } = useToast();

  const chosen = AUDIENCE_OPTS.find((o) => o.value === audience)!;

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) setList(await res.json());
    } finally { setLoadingList(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  function parseEmails() {
    return emailsRaw.split(/[\n,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Nhập nội dung thông báo."); return; }
    if (audience === "emails" && parseEmails().length === 0) {
      toast.error("Nhập ít nhất một địa chỉ email."); return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), href: href.trim(), audience, emails: parseEmails() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Không lưu được."); return; }
      toast.success("Đã lưu. Chuyển trạng thái sang OK trong bảng bên dưới để gửi.");
      setTitle(""); setEmailsRaw("");
      await fetchList();
    } finally { setBusy(false); }
  }

  async function toggleStatus(row: BroadcastRow) {
    const next: Status = row.status === "ok" ? "off" : "ok";
    if (next === "ok") {
      const target = row.audience === "emails"
        ? `${row.emails.length} email: ${row.emails.slice(0, 2).join(", ")}${row.emails.length > 2 ? "…" : ""}`
        : (row.audience ? AUDIENCE_LABELS[row.audience] : "...");
      if (!confirm(`Kích hoạt và gửi thông báo tới ${target}?\n"${row.title}"\n\nHành động này sẽ gửi ngay đến người nhận.`)) return;
    }
    setToggling(row._id);
    try {
      const res = await fetch(`/api/admin/notifications/${row._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Không cập nhật được."); return; }
      if (next === "ok" && data.sentCount != null) toast.success(`Đã gửi tới ${data.sentCount} người.`);
      else toast.success("Đã cập nhật trạng thái.");
      await fetchList();
    } finally { setToggling(null); }
  }

  async function deleteRow(row: BroadcastRow) {
    if (!confirm(`Xoá thông báo "${row.title}"?`)) return;
    setDeleting(row._id);
    try {
      const res = await fetch(`/api/admin/notifications/${row._id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Không xoá được."); return; }
      toast.success("Đã xoá.");
      await fetchList();
    } finally { setDeleting(null); }
  }

  function audienceCell(row: BroadcastRow) {
    if (!row.audience) return <span className="text-muted">—</span>;
    if (row.audience === "emails") {
      return (
        <span title={row.emails.join(", ")}>
          {row.emails.slice(0, 1).join(", ")}
          {row.emails.length > 1 && <span className="text-muted"> +{row.emails.length - 1}</span>}
        </span>
      );
    }
    return AUDIENCE_LABELS[row.audience];
  }

  const counts = useMemo(() => ({
    "":    list.length,
    off:   list.filter((r) => r.status === "off").length,
    ok:    list.filter((r) => r.status === "ok").length,
  }), [list]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return list.filter((row) => {
      if (fStatus && row.status !== fStatus) return false;
      if (fAudience && row.audience !== fAudience) return false;
      if (kw && !row.title.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [list, fStatus, fAudience, q]);

  const hasSecondaryFilter = !!fAudience;
  const pg = usePagination(filtered, 20);

  return (
    <>
      {/* Form soạn thảo */}
      <form className="qp-acc-card" onSubmit={submit}>
        <div className="qp-acc-card__title">Soạn thông báo</div>

        <div className="qp-form-group">
          <label className="qp-label">Đối tượng nhận <span className="req">*</span></label>
          <div className="qp-perm-pills" role="group">
            {AUDIENCE_OPTS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`qp-perm-pill qp-perm-pill--${o.pill}${audience === o.value ? " is-active" : ""}`}
                onClick={() => setAudience(o.value)}
                aria-pressed={audience === o.value}
                title={o.desc}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="type-body-small text-muted" style={{ marginTop: 6 }}>{chosen.desc}</p>
        </div>

        {audience === "emails" && (
          <div className="qp-form-group">
            <label className="qp-label">Danh sách email <span className="req">*</span></label>
            <textarea
              className="qp-textarea"
              rows={4}
              value={emailsRaw}
              onChange={(e) => setEmailsRaw(e.target.value)}
              placeholder={"example1@email.com\nexample2@email.com"}
            />
            <p className="type-body-small text-muted" style={{ marginTop: 4 }}>
              Mỗi dòng một email. Chỉ tài khoản đã đăng ký mới nhận được.
              {parseEmails().length > 0 && <> · <b>{parseEmails().length} địa chỉ</b></>}
            </p>
          </div>
        )}

        <div className="qp-form-group">
          <label className="qp-label">Nội dung <span className="req">*</span></label>
          <input
            className="qp-input"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Họp ban quản trị lúc 14h hôm nay"
          />
        </div>

        {audience !== "staff" && (
          <div className="qp-form-group">
            <label className="qp-label">Liên kết khi bấm vào</label>
            <input
              className="qp-input"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="/thong-bao hoặc /tin-tuc/..."
            />
          </div>
        )}

        <div>
          <button type="submit" className="qp-btn-primary" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu thông báo"}
          </button>
        </div>
        <p className="type-body-small text-muted" style={{ marginTop: 12 }}>
          Thông báo được lưu vào danh sách bên dưới. Chuyển trạng thái sang <b>OK</b> để gửi đến người nhận.
        </p>
      </form>

      {/* Bảng lịch sử — theo pattern tin tức */}
      <div className="qp-acc-page" style={{ marginTop: 24 }}>
        <div className="qp-acc-card__title" style={{ marginBottom: "var(--space-3)" }}>Lịch sử gửi thông báo</div>

        {/* Hàng 1: tabs trạng thái có đếm */}
        <div className="qp-tabs" style={{ marginBottom: "var(--space-3)" }}>
          {SEND_STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`qp-tab${fStatus === t.value ? " is-active" : ""}`}
              onClick={() => { setFStatus(t.value); pg.setPage(1); }}
            >
              {t.label}
              <span className="qp-tab__count">{counts[t.value]}</span>
            </button>
          ))}
        </div>

        {/* Hàng 2: search + filter phụ + page size */}
        <div className="qp-filter-strip">
          <input
            className="qp-input qp-admin-toolbar__search"
            placeholder="Tìm theo nội dung…"
            value={q}
            onChange={(e) => { setQ(e.target.value); pg.setPage(1); }}
          />
          <FilterSelect
            placeholder="Tất cả đối tượng"
            value={fAudience}
            onChange={(v) => { setFAudience(v); pg.setPage(1); }}
            showSearch={false}
            options={AUDIENCE_OPTS.map((o) => ({ value: o.value, label: o.label }))}
          />
          {hasSecondaryFilter && (
            <button type="button" className="qp-filter-strip__clear" onClick={() => { setFAudience(""); pg.setPage(1); }}>
              ✕ Xoá bộ lọc
            </button>
          )}
          <span className="qp-filter-strip__spacer" />
          <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
        </div>

        {loadingList ? (
          <p className="type-body-small text-muted">Đang tải…</p>
        ) : filtered.length === 0 ? (
          <div className="qp-empty">
            <div className="qp-empty__title">
              {hasSecondaryFilter || q ? "Không tìm thấy kết quả" : "Chưa có thông báo nào"}
            </div>
            <p className="type-body-small">
              {hasSecondaryFilter || q
                ? "Thử xoá bộ lọc hoặc thay đổi từ khoá tìm kiếm."
                : "Soạn và lưu thông báo ở form trên để bắt đầu."}
            </p>
          </div>
        ) : (
          <div className="qp-table--wrap">
            <table className="qp-table">
              <thead>
                <tr>
                  <th>Nội dung</th>
                  <th>Đối tượng</th>
                  <th>Trạng thái</th>
                  <th>Đã gửi</th>
                  <th>Thời gian</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pg.paged.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <b className="qp-clip" title={row.title}>{row.title}</b>
                      <span className="qp-clip--sm type-body-small text-muted">{row.href}</span>
                    </td>
                    <td className="type-body-small">{audienceCell(row)}</td>
                    <td>
                      <span className={`qp-acc-badge is-${row.status === "ok" ? "active" : "hidden"}`}>
                        {row.status === "ok" ? "OK" : "Off"}
                      </span>
                      {row.legacy && <span className="type-body-small text-muted" style={{ marginLeft: 6 }}>cũ</span>}
                    </td>
                    <td className="type-body-small">
                      {row.sentAt
                        ? <span>{row.sentCount != null ? `${row.sentCount} người` : "Đã gửi"}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="type-body-small text-muted">{fmtDate(row.createdAt)}</td>
                    <td className="qp-admin-actions">
                      {row.legacy ? (
                        <span className="type-body-small text-muted">Hệ thống cũ</span>
                      ) : (
                        <>
                          <button
                            className={row.status === "ok" ? "qp-btn-outline" : "qp-btn-primary"}
                            style={{ fontSize: 13, padding: "4px 12px" }}
                            disabled={toggling === row._id}
                            onClick={() => toggleStatus(row)}
                          >
                            {toggling === row._id ? "…" : row.status === "ok" ? "Tắt" : "Kích hoạt"}
                          </button>
                          <button
                            className="qp-btn-outline"
                            style={{ fontSize: 13, padding: "4px 12px", color: "var(--color-danger, #e53e3e)" }}
                            disabled={deleting === row._id}
                            onClick={() => deleteRow(row)}
                          >
                            {deleting === row._id ? "…" : "Xoá"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={pg.page} totalPages={pg.totalPages} onPage={pg.setPage} />
          </div>
        )}
      </div>
    </>
  );
}
