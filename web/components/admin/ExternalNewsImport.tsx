"use client";

// Nút + modal "Tạo tin từ nguồn ngoài": gọi API ngoài (NewsAPI) lấy tin Quỳnh Phụ,
// admin tick chọn nhiều tin rồi tạo HÀNG LOẠT bản nháp để chỉnh sửa lại trước khi xuất bản.
import { useState } from "react";
import { useModalDismiss } from "@/lib/use-modal-dismiss";
import { useToast } from "@/components/common/Toast";
import { formatDate } from "@/lib/datetime";
import type { ArticleRow } from "@/lib/articles";

type ExternalItem = {
  id: string; title: string; description: string; url: string; image: string; source: string; publishedAt: string;
};

export function ExternalNewsImport({ onImported }: { onImported: (rows: ArticleRow[]) => void }) {
  const [show, setShow] = useState(false);
  useModalDismiss(show, () => setShow(false));
  const [q, setQ] = useState("Quỳnh Phụ");
  const [items, setItems] = useState<ExternalItem[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();

  const selected = items.filter((i) => sel[i.id]);

  async function search() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/articles/external?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Không lấy được tin.");
        setItems([]);
      } else {
        setItems(Array.isArray(data.items) ? data.items : []);
        setSel({});
      }
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  function open() {
    setShow(true);
    if (!loaded) void search();
  }

  function toggle(id: string) {
    setSel((s) => ({ ...s, [id]: !s[id] }));
  }
  function toggleAll() {
    if (selected.length === items.length) setSel({});
    else setSel(Object.fromEntries(items.map((i) => [i.id, true])));
  }

  async function createDrafts() {
    if (!selected.length) {
      toast.error("Chọn ít nhất 1 tin.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/articles/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Tạo bản nháp thất bại.");
        return;
      }
      const rows = (data.items as ArticleRow[]) || [];
      onImported(rows);
      toast.success(`Đã tạo ${rows.length} bản nháp. Vào “Sửa” để hoàn thiện rồi xuất bản.`);
      setShow(false);
      setSel({});
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button type="button" className="qp-btn-outline" onClick={open}>↧ Tạo tin từ nguồn ngoài</button>

      {show && (
        <div className="qp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShow(false); }}>
          <div className="qp-modal qp-admin-modal" style={{ width: "min(820px, 100%)" }}>
            <div className="qp-modal__head">
              <b>Tạo tin từ nguồn ngoài</b>
              <button type="button" className="qp-icon-btn" aria-label="Đóng" onClick={() => setShow(false)}>✕</button>
            </div>

            <div className="qp-modal__body" style={{ padding: "var(--space-5)" }}>
              <form
                className="qp-admin-toolbar"
                style={{ marginBottom: 16 }}
                onSubmit={(e) => { e.preventDefault(); void search(); }}
              >
                <input
                  className="qp-input qp-admin-toolbar__search"
                  placeholder="Từ khoá tìm tin… (VD: Quỳnh Phụ)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button type="submit" className="qp-btn-primary" disabled={loading}>
                  {loading ? "Đang tìm…" : "Tìm"}
                </button>
              </form>

              {err && <div className="qp-alert is-error" style={{ marginBottom: 12 }}>{err}</div>}

              {!err && items.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label className="qp-check">
                    <input
                      type="checkbox"
                      checked={selected.length === items.length}
                      ref={(el) => { if (el) el.indeterminate = selected.length > 0 && selected.length < items.length; }}
                      onChange={toggleAll}
                    />{" "}
                    Chọn tất cả ({items.length})
                  </label>
                  <span className="type-body-small text-muted">Đã chọn: {selected.length}</span>
                </div>
              )}

              <div style={{ maxHeight: 420, overflowY: "auto", display: "grid", gap: 8 }}>
                {loading && <div className="type-body-small text-muted">Đang tải tin…</div>}
                {!loading && !err && items.length === 0 && loaded && (
                  <div className="qp-empty"><div className="qp-empty__title">Không có tin phù hợp</div></div>
                )}
                {items.map((it) => (
                  <label
                    key={it.id}
                    style={{
                      display: "flex", gap: 12, padding: 12, cursor: "pointer", alignItems: "flex-start",
                      border: "1px solid var(--color-line, #E5E7EB)", borderRadius: "var(--radius-card, 10px)",
                      background: sel[it.id] ? "var(--color-indigo-pale, #EEF2FF)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!sel[it.id]}
                      onChange={() => toggle(it.id)}
                      style={{ marginTop: 4 }}
                    />
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image}
                        alt=""
                        width={84}
                        height={56}
                        style={{ width: 84, height: 56, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                        loading="lazy"
                      />
                    ) : null}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{it.title}</div>
                      {it.description && (
                        <div className="type-body-small text-muted" style={{ marginTop: 2 }}>{it.description}</div>
                      )}
                      <div className="type-body-small text-muted" style={{ marginTop: 4 }}>
                        {[it.source, formatDate(it.publishedAt, "")].filter(Boolean).join(" • ")}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="qp-modal__foot">
              <span className="type-body-small text-muted" style={{ marginRight: "auto" }}>
                Tin tạo ra ở trạng thái <b>Bản nháp</b> để bạn chỉnh sửa rồi mới xuất bản.
              </span>
              <button type="button" className="qp-btn-outline" onClick={() => setShow(false)}>Huỷ</button>
              <button type="button" className="qp-btn-primary" disabled={creating || !selected.length} onClick={createDrafts}>
                {creating ? "Đang tạo…" : `Tạo ${selected.length || ""} bản nháp`.trim()}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
