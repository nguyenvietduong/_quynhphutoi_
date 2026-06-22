// Biểu đồ tròn (donut) SVG thuần + legend có % .
export type DonutItem = { label: string; value: number; color: string };

export function Donut({
  items,
  size = 128,
  thickness = 20,
  centerLabel,
}: {
  items: DonutItem[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r     = (size - thickness) / 2;
  const c     = size / 2;
  const circ  = 2 * Math.PI * r;
  let   offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Biểu đồ tròn"
        style={{ flexShrink: 0 }}
      >
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-navy-pale)" strokeWidth={thickness} />
        {total > 0 && items.map((it, i) => {
          const len = (it.value / total) * circ;
          const seg = (
            <circle
              key={i} cx={c} cy={c} r={r}
              fill="none" stroke={it.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${c} ${c})`}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return seg;
        })}
        <text x={c} y={c - 5}  textAnchor="middle" className="qp-donut__num" style={{ fontSize: 18 }}>
          {total.toLocaleString("vi-VN")}
        </text>
        <text x={c} y={c + 12} textAnchor="middle" className="qp-donut__cap">
          {centerLabel ?? "Tổng"}
        </text>
      </svg>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9, flex: 1, minWidth: 130 }}>
        {items.map((it, i) => {
          const pct = total > 0 ? Math.round((it.value / total) * 100) : 0;
          return (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: "var(--color-gray-text)", lineHeight: 1.3 }}>{it.label}</span>
              <b style={{ fontSize: 13, color: "var(--color-navy-deep)", fontVariantNumeric: "tabular-nums" }}>
                {it.value.toLocaleString("vi-VN")}
              </b>
              <span style={{ fontSize: 11, color: "var(--color-gray-text)", minWidth: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
