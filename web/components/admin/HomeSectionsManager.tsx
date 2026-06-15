"use client";

// Quản trị các khối trang chủ: bật/tắt, chọn chế độ (mới nhất/ngẫu nhiên/thủ công),
// số lượng, và picker chọn item thủ công cho từng khối.
import { useMemo, useState } from "react";
import { useToast } from "@/components/common/Toast";
import type { HomeSectionsConfig, HomeSectionConfig, HomeSectionKey, HomeSectionMode, HomeCandidate } from "@/lib/home-sections";

// Hằng client-safe (KHÔNG import value từ lib/home-sections — sẽ kéo mongodb vào bundle).
const KEYS: HomeSectionKey[] = ["tin-tuc", "viec-lam", "tim-do-roi", "mua-ban", "marquee"];
const LABEL: Record<HomeSectionKey, string> = { "tin-tuc": "Tin tức", "viec-lam": "Việc làm", "tim-do-roi": "Tìm đồ rơi", "mua-ban": "Mua bán", "marquee": "Dải chạy dưới navbar (Marquee)" };
const NOTE: Partial<Record<HomeSectionKey, string>> = { "marquee": "Dải chạy “Cập nhật mới” ngay dưới thanh menu — chỉ lấy tiêu đề từ Tin tức." };
const MODES: { value: HomeSectionMode; label: string }[] = [
  { value: "latest", label: "Mới nhất" },
  { value: "random", label: "Ngẫu nhiên" },
  { value: "manual", label: "Chọn thủ công" },
];

export function HomeSectionsManager({ initialConfig, candidates }: { initialConfig: HomeSectionsConfig; candidates: Record<HomeSectionKey, HomeCandidate[]> }) {
  const [cfg, setCfg] = useState<HomeSectionsConfig>(initialConfig);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  function patch(key: HomeSectionKey, p: Partial<HomeSectionConfig>) {
    setCfg((cur) => ({ ...cur, [key]: { ...cur[key], ...p } }));
  }
  function toggleSlug(key: HomeSectionKey, slug: string) {
    setCfg((cur) => {
      const sel = cur[key].manualSlugs;
      const next = sel.includes(slug) ? sel.filter((s) => s !== slug) : [...sel, slug];
      return { ...cur, [key]: { ...cur[key], manualSlugs: next } };
    });
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/home-sections", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: cfg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Lưu thất bại."); return; }
      if (data.config) setCfg(data.config);
      toast.success("Đã lưu cấu hình trang chủ.");
    } finally { setBusy(false); }
  }

  return (
    <div className="qp-acc-page">
      {KEYS.map((key) => (
        <SectionCard
          key={key}
          k={key}
          cfg={cfg[key]}
          candidates={candidates[key] ?? []}
          onPatch={(p) => patch(key, p)}
          onToggleSlug={(s) => toggleSlug(key, s)}
        />
      ))}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button type="button" className="qp-btn-primary" onClick={save} disabled={busy}>{busy ? "Đang lưu…" : "Lưu cấu hình"}</button>
      </div>
    </div>
  );
}

function SectionCard({ k, cfg, candidates, onPatch, onToggleSlug }: {
  k: HomeSectionKey;
  cfg: HomeSectionConfig;
  candidates: HomeCandidate[];
  onPatch: (p: Partial<HomeSectionConfig>) => void;
  onToggleSlug: (slug: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return kw ? candidates.filter((c) => c.title.toLowerCase().includes(kw)) : candidates;
  }, [q, candidates]);
  const selected = new Set(cfg.manualSlugs);

  return (
    <div className="qp-acc-card">
      <div className="qp-acc-card__title qp-acc-card__title--row" style={{ marginBottom: NOTE[k] ? 4 : 12 }}>
        <span>{LABEL[k]}</span>
        <label className="qp-check" style={{ margin: 0 }}>
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => onPatch({ enabled: e.target.checked })} /> Hiển thị khối
        </label>
      </div>
      {NOTE[k] && <p className="type-body-small text-muted" style={{ marginBottom: 12 }}>{NOTE[k]}</p>}

      <div className="qp-acc-grid2">
        <div className="qp-form-group">
          <label className="qp-label">Chế độ hiển thị</label>
          <select className="qp-select" value={cfg.mode} onChange={(e) => onPatch({ mode: e.target.value as HomeSectionMode })} disabled={!cfg.enabled}>
            {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="qp-form-group">
          <label className="qp-label">Số lượng hiển thị</label>
          <input type="number" min={1} max={12} className="qp-input" value={cfg.limit} onChange={(e) => onPatch({ limit: Number(e.target.value) || 1 })} disabled={!cfg.enabled} />
        </div>
      </div>

      {cfg.enabled && cfg.mode === "manual" && (
        <div className="qp-form-group">
          <label className="qp-label">Chọn item — {cfg.manualSlugs.length} đã chọn (hiển thị tối đa {cfg.limit})</label>
          {candidates.length === 0 ? (
            <p className="type-body-small text-muted">Chưa có item nào để chọn (cần bài/tin đã đăng &amp; được duyệt).</p>
          ) : (
            <>
              <input className="qp-input" placeholder="Tìm theo tiêu đề…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
              <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 8, padding: 8 }}>
                {filtered.map((c) => (
                  <label key={c.slug} className="qp-check" style={{ display: "flex", gap: 8, padding: "4px 2px", alignItems: "flex-start" }}>
                    <input type="checkbox" checked={selected.has(c.slug)} onChange={() => onToggleSlug(c.slug)} />
                    <span>{c.title}</span>
                  </label>
                ))}
                {filtered.length === 0 && <p className="type-body-small text-muted" style={{ margin: 4 }}>Không khớp từ khoá.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
