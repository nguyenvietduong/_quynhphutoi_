"use client";

// Quản trị danh sách từ cấm (lọc từ ngữ thô tục): tìm kiếm, thêm (một hoặc nhiều
// từ ngăn bởi dấu phẩy), sửa trực tiếp trên bảng, bật/tắt, xoá, copy toàn bộ,
// khôi phục mặc định. Giao diện gọn.
import { useMemo, useState } from "react";
import { useToast } from "@/components/common/Toast";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { RowActions } from "@/components/admin/RowActions";
import type { ProfanityRow } from "@/lib/profanity";

const SMALL = 12.5;

export function ProfanityManager({ initial }: { initial: ProfanityRow[] }) {
  const [rows, setRows] = useState<ProfanityRow[]>(initial);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [bulk, setBulk] = useState("");
  const [newAccent, setNewAccent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const counts = useMemo(() => ({ all: rows.length, on: rows.filter((r) => r.enabled).length }), [rows]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return kw ? rows.filter((r) => r.text.toLowerCase().includes(kw)) : rows;
  }, [rows, q]);
  const pg = usePagination(filtered, 50);

  async function patchRow(id: string, patch: Partial<Pick<ProfanityRow, "text" | "accentInsensitive" | "enabled">>) {
    const res = await fetch(`/api/admin/profanity/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || "Không lưu được."); return false; }
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    return true;
  }

  async function commitText(r: ProfanityRow) {
    const val = (edits[r.id] ?? r.text).trim();
    setEdits((e) => { const n = { ...e }; delete n[r.id]; return n; });
    if (!val || val === r.text) return;
    if (await patchRow(r.id, { text: val })) toast.success("Đã lưu.");
  }

  async function toggle(r: ProfanityRow, key: "enabled" | "accentInsensitive") {
    await patchRow(r.id, { [key]: !r[key] } as Partial<ProfanityRow>);
  }

  async function remove(r: ProfanityRow) {
    if (!confirm(`Xoá từ cấm "${r.text}"?`)) return;
    const res = await fetch(`/api/admin/profanity/${r.id}`, { method: "DELETE" });
    if (res.ok) { setRows((cur) => cur.filter((x) => x.id !== r.id)); toast.success("Đã xoá."); }
    else toast.error("Xoá thất bại.");
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const parts = bulk.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0 || busy) return;
    setBusy(true);
    try {
      if (parts.length === 1) {
        const res = await fetch("/api/admin/profanity", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: parts[0], accentInsensitive: newAccent }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { toast.error(data.error || "Không thêm được."); return; }
        setRows((cur) => [data.item, ...cur]);
        toast.success("Đã thêm từ cấm.");
      } else {
        const res = await fetch("/api/admin/profanity", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bulk, accentInsensitive: newAccent }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { toast.error(data.error || "Không thêm được."); return; }
        setRows((cur) => [...(data.items ?? []), ...cur]);
        const dup = parts.length - (data.added ?? 0);
        toast.success(`Đã thêm ${data.added} từ${dup > 0 ? `, bỏ qua ${dup} trùng/lỗi` : ""}.`);
      }
      setBulk(""); setNewAccent(false);
    } finally { setBusy(false); }
  }

  async function copyAll() {
    const text = rows.map((r) => r.text).join(", ");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Đã copy ${rows.length} từ vào bộ nhớ tạm.`);
    } catch {
      toast.error("Trình duyệt chặn copy. Hãy bôi đen thủ công.");
    }
  }

  async function importLib() {
    if (busy) return;
    if (!confirm("Nạp từ điển tục tiếng Anh từ thư viện (leo-profanity + bad-words)? Chỉ thêm từ chưa có.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/profanity/import", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Không nạp được."); return; }
      if (data.added > 0) {
        const list = await fetch("/api/admin/profanity").then((r) => r.json()).catch(() => ({ items: rows }));
        setRows(list.items ?? rows);
        toast.success(`Đã thêm ${data.added} từ tiếng Anh (quét ${data.scanned}).`);
      } else toast.info("Đã có đủ, không thêm từ nào từ thư viện.");
    } finally { setBusy(false); }
  }

  async function restoreDefaults() {
    if (busy) return;
    if (!confirm("Nạp lại các từ cấm mặc định còn thiếu? (Không ghi đè từ đã chỉnh sửa)")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/profanity/seed", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Không nạp được."); return; }
      if (data.added > 0) {
        const list = await fetch("/api/admin/profanity").then((r) => r.json()).catch(() => ({ items: rows }));
        setRows(list.items ?? rows);
        toast.success(`Đã thêm ${data.added} từ mặc định.`);
      } else toast.info("Danh sách đã đầy đủ, không có gì để thêm.");
    } finally { setBusy(false); }
  }

  const Switch = ({ on, onChange, title }: { on: boolean; onChange: () => void; title: string }) => (
    <span className="qp-switch qp-switch--sm" title={title} style={{ transform: "scale(0.82)" }}>
      <input type="checkbox" checked={on} onChange={onChange} aria-label={title} />
      <span className="qp-switch__track" />
    </span>
  );

  const cellInput: React.CSSProperties = { height: 30, padding: "2px 8px", fontSize: SMALL, maxWidth: 300 };

  return (
    <div className="qp-acc-page" style={{ fontSize: SMALL }}>
      {/* Thanh tóm tắt + hành động — gọn 1 dòng */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <span className="text-muted">
          Tổng <b>{counts.all}</b> từ · đang bật <b>{counts.on}</b> · tắt <b>{counts.all - counts.on}</b>
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" className="qp-btn-outline qp-btn-sm" onClick={copyAll} disabled={!rows.length} style={{ fontSize: SMALL }}>Copy tất cả</button>
        <button type="button" className="qp-btn-outline qp-btn-sm" onClick={importLib} disabled={busy} style={{ fontSize: SMALL }}>Nạp từ thư viện</button>
        <button type="button" className="qp-btn-outline qp-btn-sm" onClick={restoreDefaults} disabled={busy} style={{ fontSize: SMALL }}>Khôi phục mặc định</button>
      </div>

      {/* Thêm — một hoặc nhiều từ ngăn bởi dấu phẩy */}
      <form className="qp-chart-card" onSubmit={add} style={{ padding: 12, marginBottom: 12 }}>
        <label className="qp-label" style={{ fontSize: SMALL }}>Thêm từ cấm (nhiều từ ngăn bằng dấu phẩy)</label>
        <textarea
          className="qp-textarea" rows={2} value={bulk} onChange={(e) => setBulk(e.target.value)}
          placeholder="VD: thằng ngu, đồ vô học, mất nết, …"
          style={{ fontSize: SMALL, minHeight: 52 }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <Switch on={newAccent} onChange={() => setNewAccent((v) => !v)} title="Khớp cả không dấu" />
            <span>Khớp cả không dấu <span className="text-muted">(nên bật cho cụm dài / viết tắt)</span></span>
          </label>
          <span style={{ flex: 1 }} />
          <button type="submit" className="qp-btn-primary qp-btn-sm" disabled={busy || !bulk.trim()} style={{ fontSize: SMALL }}>Thêm</button>
        </div>
      </form>

      {/* Tìm kiếm */}
      <div className="qp-admin-toolbar" style={{ marginBottom: 8 }}>
        <input className="qp-input qp-admin-toolbar__search" placeholder="Tìm từ cấm…" value={q} onChange={(e) => setQ(e.target.value)} style={{ height: 32, fontSize: SMALL }} />
        <span className="qp-admin-toolbar__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
      </div>

      {filtered.length === 0 ? (
        <div className="qp-empty"><div className="qp-empty__title">Không có từ nào</div><p className="type-body-small">{q ? "Không tìm thấy từ khớp." : "Danh sách trống — thêm từ ở trên."}</p></div>
      ) : (
        <div className="qp-table--wrap">
          <table className="qp-table" style={{ fontSize: SMALL }}>
            <thead>
              <tr>
                <th>Từ / cụm</th>
                <th style={{ width: 130, textAlign: "center" }}>Khớp không dấu</th>
                <th style={{ width: 80, textAlign: "center" }}>Bật</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {pg.paged.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      className="qp-input" style={cellInput}
                      value={edits[r.id] ?? r.text} maxLength={80}
                      onChange={(e) => setEdits((s) => ({ ...s, [r.id]: e.target.value }))}
                      onBlur={() => commitText(r)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}><Switch on={r.accentInsensitive} onChange={() => toggle(r, "accentInsensitive")} title="Khớp cả khi bỏ dấu" /></td>
                  <td style={{ textAlign: "center" }}><Switch on={r.enabled} onChange={() => toggle(r, "enabled")} title="Bật/tắt từ cấm này" /></td>
                  <td className="qp-admin-actions">
                    <RowActions actions={[{ value: "delete", label: "Xoá", run: () => remove(r) }]} />
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
