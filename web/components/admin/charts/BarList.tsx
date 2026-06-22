// Biểu đồ thanh ngang (CSS thuần) — label · thanh · giá trị · %.
export type BarItem = { label: string; value: number; color?: string };

export function BarList({ items, unit = "" }: { items: BarItem[]; unit?: string }) {
  const max   = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  if (items.length === 0) return <p className="type-body-small text-muted">Chưa có dữ liệu.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it, i) => {
        const fill = Math.round((it.value / max) * 100);
        const pct  = total > 0 ? Math.round((it.value / total) * 100) : 0;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(80px,1fr) 120px 52px", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--color-navy-deep)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.label}>
              {it.label}
            </span>
            <span style={{ height: 8, background: "var(--color-navy-pale)", borderRadius: 999, overflow: "hidden", display: "block" }}>
              <span style={{ display: "block", height: "100%", width: `${fill}%`, background: it.color ?? "var(--color-teal)", borderRadius: 999, minWidth: it.value > 0 ? 4 : 0 }} />
            </span>
            <span style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 4, whiteSpace: "nowrap" }}>
              <b style={{ fontSize: 13, fontWeight: 700, color: "var(--color-navy)", fontVariantNumeric: "tabular-nums" }}>
                {it.value.toLocaleString("vi-VN")}{unit}
              </b>
              <span style={{ fontSize: 11, color: "var(--color-gray-text)" }}>{pct}%</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
