"use client";

// Thẻ biểu đồ có pill-tabs chọn loại số liệu.
import { useState } from "react";
import { BarList, type BarItem } from "./BarList";
import { Donut, type DonutItem } from "./Donut";

export type SwitchOption =
  | { key: string; label: string; type: "bar";   items: BarItem[];   unit?: string }
  | { key: string; label: string; type: "donut"; items: DonutItem[]; center?: string };

export function ChartSwitcher({ title, options, className }: { title: string; options: SwitchOption[]; className?: string }) {
  const [key, setKey] = useState(options[0]?.key ?? "");
  const cur = options.find((o) => o.key === key) ?? options[0];

  return (
    <div className={`qp-chart-card${className ? ` ${className}` : ""}`}>
      {/* Header: tiêu đề */}
      <div style={{ marginBottom: 14 }}>
        <span className="qp-chart-card__title">{title}</span>
      </div>

      {/* Pill tabs chọn loại */}
      {options.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {options.map((o) => {
            const active = o.key === key;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setKey(o.key)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "1px solid",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  lineHeight: "1.6",
                  transition: "background 0.15s, color 0.15s, border-color 0.15s",
                  ...(active
                    ? { background: "var(--color-teal-pale)", borderColor: "var(--color-teal)", color: "var(--color-teal-dark)" }
                    : { background: "transparent", borderColor: "var(--color-gray-border)", color: "var(--color-gray-text)" }),
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {cur?.type === "bar"
        ? <BarList items={cur.items} unit={cur.unit} />
        : cur?.type === "donut"
          ? <Donut items={cur.items} centerLabel={cur.center} />
          : null}
    </div>
  );
}
