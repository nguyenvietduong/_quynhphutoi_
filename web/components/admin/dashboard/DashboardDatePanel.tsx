"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

/* ─── Types ─────────────────────────────────────────────────── */
export type DayPoint = {
  date: string; jobs: number; lostfound: number;
  classifieds: number; articles: number; total: number;
};
export type MonthPoint = {
  month: number; label: string;
  jobs: number; lostfound: number; classifieds: number; articles: number; total: number;
};
type UserDayPoint   = { date: string; count: number };
type UserMonthPoint = { month: number; count: number };

type ApiResponse = {
  period: string;
  daily?:       DayPoint[];
  monthly?:     MonthPoint[];
  userDaily?:   UserDayPoint[];
  userMonthly?: UserMonthPoint[];
};

type Mode = "day" | "month" | "quarter" | "year";

/* ─── Constants ─────────────────────────────────────────────── */
const MODES: { key: Mode; label: string }[] = [
  { key: "day",     label: "Ngày"  },
  { key: "month",   label: "Tháng" },
  { key: "quarter", label: "Quý"   },
  { key: "year",    label: "Năm"   },
];

const C = {
  jobs: "#00A98F", lost: "#6366F1", cls: "#F59E0B",
  art:  "#E1567C", all: "#0F4C81", usr: "#7C3AED",
};

const SERIES = [
  { key: "jobs",        name: "Việc làm",        color: C.jobs },
  { key: "lostfound",   name: "Tìm đồ rơi",      color: C.lost },
  { key: "classifieds", name: "Mua bán",          color: C.cls  },
  { key: "articles",    name: "Bài viết",         color: C.art  },
  { key: "total",       name: "Tổng",             color: C.all  },
];

/* SERIES không có "total" — dùng cho stacked bar (tổng đã là chiều cao cột) */
const BAR_SERIES = SERIES.slice(0, 4);

const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/* ─── Helpers ───────────────────────────────────────────────── */
function fmtNum(n: number) { return n.toLocaleString("vi-VN"); }
function viDateFull(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function viDateShort(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function dominantColor(d: DayPoint): string {
  const max = Math.max(d.articles, d.jobs, d.lostfound, d.classifieds);
  if (max === 0) return "#9ca3af";
  if (d.articles    === max) return C.art;
  if (d.jobs        === max) return C.jobs;
  if (d.lostfound   === max) return C.lost;
  return C.cls;
}

/* ─── Custom chart tooltip ──────────────────────────────────── */
type TooltipEntry = { name?: string; value?: number | string; color?: string };
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const hasTotalSeries = payload.some(p => p.name === "Tổng");
  const autoSum = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
      padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.11)",
      minWidth: 170, pointerEvents: "none",
    }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.4px", textTransform: "uppercase" }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: p.color, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{p.name}</span>
          <b style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: p.color }}>{fmtNum(Number(p.value) || 0)}</b>
        </div>
      ))}
      {!hasTotalSeries && payload.length > 1 && (
        <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Tổng</span>
          <b style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: C.all }}>{fmtNum(autoSum)}</b>
        </div>
      )}
    </div>
  );
}

/* ─── Compact metric card ────────────────────────────────────── */
function MetricCard({ label, value, outOf, color }: { label: string; value: number; outOf: number; color: string }) {
  const [hovered, setHovered] = useState(false);
  const pct = outOf > 0 ? Math.round((value / outOf) * 100) : 0;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "9px 11px 8px", borderRadius: 10,
        background: hovered ? `${color}12` : "var(--color-navy-pale,#f0f4f8)",
        border: `1.5px solid ${hovered ? color + "55" : "transparent"}`,
        borderTop: `3px solid ${color}`,
        transition: "all 0.18s", transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: hovered ? color : "var(--color-navy-deep,#0F4C81)", fontVariantNumeric: "tabular-nums", transition: "color 0.18s" }}>
          {fmtNum(value)}
        </span>
        {outOf > 0 && pct < 100 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: hovered ? color : "#9ca3af", transition: "color 0.18s" }}>{pct}%</span>
        )}
      </div>
      <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 3, marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ height: 3, background: `${color}25`, borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.45s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

/* ─── Chart legend ───────────────────────────────────────────── */
function ChartLegend({ series }: { series: { key: string; name: string; color: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 6 }}>
      {series.map((s) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
          <span style={{ fontSize: 11.5, color: "#6b7280", fontWeight: 500 }}>{s.name}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Calendar cell ──────────────────────────────────────────── */
function CalCell({
  day, dateStr, point, userCount, isToday, isFuture,
  isSelected, onSelect,
}: {
  day: number | null; dateStr: string | null;
  point: DayPoint | null; userCount: number;
  isToday: boolean; isFuture: boolean;
  isSelected: boolean; onSelect: (d: string | null) => void;
}) {
  if (!day || !dateStr) {
    return <div style={{ minHeight: 72, borderRadius: 8, background: "transparent" }} />;
  }

  const hasData = !!point && point.total > 0;
  const color   = hasData ? dominantColor(point!) : "#9ca3af";

  return (
    <div
      onClick={() => onSelect(isSelected ? null : dateStr)}
      style={{
        minHeight: 72, borderRadius: 8, padding: "7px 8px 6px",
        background: isSelected
          ? `${color}18`
          : isToday
            ? "rgba(0,169,143,0.08)"
            : "var(--color-navy-pale,#f0f4f8)",
        border: `1.5px solid ${isSelected ? color : isToday ? "#00A98F" : "transparent"}`,
        cursor: hasData ? "pointer" : "default",
        transition: "background 0.14s, border-color 0.14s",
        opacity: isFuture ? 0.38 : 1,
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* Day number */}
      <div style={{
        fontSize: 11, fontWeight: isToday ? 800 : 600, lineHeight: 1,
        color: isToday ? "#00A98F" : isFuture ? "#9ca3af" : "#374151",
        display: "flex", alignItems: "center", gap: 3,
      }}>
        {day}
        {isToday && (
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00A98F", display: "inline-block" }} />
        )}
      </div>

      {hasData && (
        <>
          <div style={{ fontSize: 18, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", lineHeight: 1, marginTop: 5 }}>
            {point!.total}
          </div>
          {/* Category dots */}
          <div style={{ display: "flex", gap: 2, marginTop: 4, flexWrap: "wrap" }}>
            {[
              { v: point!.jobs,        c: C.jobs },
              { v: point!.lostfound,   c: C.lost },
              { v: point!.classifieds, c: C.cls  },
              { v: point!.articles,    c: C.art  },
              ...(userCount > 0 ? [{ v: userCount, c: C.usr }] : []),
            ].filter(s => s.v > 0).map(({ c }, idx) => (
              <span key={idx} style={{ width: 5, height: 5, borderRadius: "50%", background: c, flexShrink: 0 }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Calendar grid ──────────────────────────────────────────── */
function CalendarGrid({
  year, month, data, showUserStats, userByDate, selectedDate, onSelect,
}: {
  year: number; month: number; data: DayPoint[];
  showUserStats: boolean; userByDate: Map<string, number>;
  selectedDate: string | null; onSelect: (d: string | null) => void;
}) {
  const todayStr  = new Date().toISOString().slice(0, 10);
  const dataMap   = new Map(data.map(d => [d.date, d]));
  const firstDow  = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const lastDay   = new Date(year, month, 0).getDate();

  const cells: { day: number | null; dateStr: string | null }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= lastDay; d++) {
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({ day: d, dateStr: `${year}-${mm}-${dd}` });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, dateStr: null });

  const selectedPoint = selectedDate ? dataMap.get(selectedDate) : null;
  const selectedUser  = selectedDate ? (userByDate.get(selectedDate) ?? 0) : 0;

  return (
    <div>
      {/* Month + year label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-navy-deep,#0F4C81)" }}>
          Tháng {month}/{year}
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>
          (click vào ngày để xem chi tiết)
        </span>
      </div>

      {/* DOW headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
        {DOW.map((l) => (
          <div key={l} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#9ca3af", padding: "3px 0" }}>
            {l}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((cell, i) => (
          <CalCell
            key={cell.dateStr ?? `empty-${i}`}
            day={cell.day}
            dateStr={cell.dateStr}
            point={cell.dateStr ? (dataMap.get(cell.dateStr) ?? null) : null}
            userCount={cell.dateStr ? (userByDate.get(cell.dateStr) ?? 0) : 0}
            isToday={cell.dateStr === todayStr}
            isFuture={!!cell.dateStr && cell.dateStr > todayStr}
            isSelected={cell.dateStr === selectedDate}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Detail panel */}
      {selectedDate && (
        <div style={{
          marginTop: 14, padding: "12px 16px",
          background: "var(--color-navy-pale,#f0f4f8)",
          borderRadius: 10, borderLeft: `3px solid ${C.all}`,
          display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start",
        }}>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>
              {viDateFull(selectedDate)}
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {[
                { label: "Việc làm",     value: selectedPoint?.jobs        ?? 0, color: C.jobs },
                { label: "Tìm đồ rơi",  value: selectedPoint?.lostfound   ?? 0, color: C.lost },
                { label: "Mua bán",      value: selectedPoint?.classifieds ?? 0, color: C.cls  },
                { label: "Bài viết",     value: selectedPoint?.articles    ?? 0, color: C.art  },
                ...(showUserStats ? [{ label: "Người dùng mới", value: selectedUser, color: C.usr }] : []),
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.value > 0 ? s.color : "#d1d5db", fontVariantNumeric: "tabular-nums" }}>
                    {fmtNum(s.value)}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
              <div style={{ textAlign: "center", borderLeft: "1px solid #e5e7eb", paddingLeft: 14 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.all, fontVariantNumeric: "tabular-nums" }}>
                  {fmtNum(selectedPoint?.total ?? 0)}
                </div>
                <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>Tổng</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Day view (Ngày) ────────────────────────────────────────── */
function DayView({ data, showUserStats, userCount }: { data: DayPoint[]; showUserStats: boolean; userCount: number }) {
  const d = data[0] ?? { jobs: 0, lostfound: 0, classifieds: 0, articles: 0, total: 0 };
  const items = [
    { label: "Bài viết",        value: d.articles,    color: C.art  },
    { label: "Việc làm",        value: d.jobs,         color: C.jobs },
    { label: "Tìm đồ rơi",     value: d.lostfound,   color: C.lost },
    { label: "Mua bán",         value: d.classifieds, color: C.cls  },
    ...(showUserStats ? [{ label: "Người dùng mới", value: userCount, color: C.usr }] : []),
  ];
  const maxVal = Math.max(1, ...items.map(i => i.value));

  if (d.total === 0 && (!showUserStats || userCount === 0)) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
        Chưa có tin · bài mới hôm nay
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
        {items.filter(i => i.value > 0).map((it) => (
          <div key={it.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: it.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {fmtNum(it.value)}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{it.label}</div>
          </div>
        ))}
      </div>
      {/* Horizontal proportion bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map(it => (
          <div key={it.label} style={{ display: "grid", gridTemplateColumns: "100px 1fr 40px", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#6b7280", textAlign: "right", whiteSpace: "nowrap" }}>{it.label}</span>
            <div style={{ height: 6, background: `${it.color}20`, borderRadius: 99 }}>
              <div style={{ height: "100%", width: `${(it.value / maxVal) * 100}%`, background: it.color, borderRadius: 99, transition: "width 0.4s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: it.value > 0 ? it.color : "#d1d5db", fontVariantNumeric: "tabular-nums" }}>
              {fmtNum(it.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Line chart view — dùng chung cho Tháng + Quý ──────────── */
function LineChartView({ data, showUserStats, userByDate, gradId = "gl" }: {
  data: DayPoint[]; showUserStats: boolean;
  userByDate: Map<string, number>; gradId?: string;
}) {
  const chartData = data.map(d => ({
    label: viDateShort(d.date),
    jobs: d.jobs, lostfound: d.lostfound,
    classifieds: d.classifieds, articles: d.articles,
    total: d.total,
    ...(showUserStats ? { users: userByDate.get(d.date) ?? 0 } : {}),
  }));

  const allSeries = showUserStats ? [...SERIES, { key: "users", name: "Người dùng mới", color: C.usr }] : SERIES;

  return (
    <>
      <ChartLegend series={allSeries} />
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <defs>
            {allSeries.map(s => (
              <linearGradient key={s.key} id={`${gradId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={s.color} stopOpacity={s.key === "total" ? 0.12 : 0.18} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#0F4C8122", strokeWidth: 1, strokeDasharray: "4 3" }} />
          {allSeries.map(s => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name}
              stroke={s.color} strokeWidth={s.key === "total" ? 2.5 : 1.8}
              strokeDasharray={s.key === "total" ? "5 3" : undefined}
              fill={`url(#${gradId}-${s.key})`} dot={false}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: "#fff", fill: s.color }}
              animationDuration={500} animationEasing="ease-out" />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

/* ─── Year view (Năm) — Stacked BarChart ────────────────────── */
function YearView({ monthly, showUserStats, userMonthly }: { monthly: MonthPoint[]; showUserStats: boolean; userMonthly: Map<number, number> }) {
  const chartData = monthly.map(m => ({
    label: m.label,
    month: m.month,
    jobs: m.jobs, lostfound: m.lostfound,
    classifieds: m.classifieds, articles: m.articles,
    ...(showUserStats ? { users: userMonthly.get(m.month) ?? 0 } : {}),
  }));

  /* Không dùng SERIES vì "total" redundant trong stacked bar */
  const allSeries = showUserStats ? [...BAR_SERIES, { key: "users", name: "Người dùng mới", color: C.usr }] : BAR_SERIES;
  const now = new Date();

  return (
    <>
      <ChartLegend series={allSeries} />
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 4" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0F4C8108" }} />
          {allSeries.map((s, si) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a"
              fill={s.color} radius={si === allSeries.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              animationDuration={500}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.month}
                  opacity={entry.month > now.getMonth() + 1 ? 0.3 : 1}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export function DashboardDatePanel({
  initial,
  showUserStats = false,
}: {
  initial: DayPoint[];
  showUserStats?: boolean;
}) {
  const [mode, setMode]       = useState<Mode>("month");
  const [resp, setResp]       = useState<ApiResponse>({ period: "month", daily: initial });
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const load = useCallback(async (m: Mode) => {
    setLoading(true);
    setSelectedDate(null);
    try {
      const res = await fetch(`/api/admin/stats?period=${m}`);
      if (res.ok) {
        setResp(await res.json());
        setUpdatedAt(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => load(mode), 5 * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, [mode, load]);

  function handleMode(m: Mode) {
    setMode(m);
    if (m !== "month" || updatedAt) load(m);
  }

  /* ── Derived data ── */
  const daily      = resp.daily   ?? [];
  const monthly    = resp.monthly ?? [];
  const userByDate = new Map((resp.userDaily   ?? []).map(u => [u.date,  u.count]));
  const userByMth  = new Map((resp.userMonthly ?? []).map(u => [u.month, u.count]));

  const sumDay  = (k: keyof DayPoint) => daily.reduce((s, d) => s + (d[k] as number), 0);
  const sumMth  = (k: keyof MonthPoint) => monthly.reduce((s, m) => s + (m[k] as number), 0);
  const isYr    = mode === "year";

  const totalContent = isYr ? sumMth("total") : sumDay("total");
  const totalJobs    = isYr ? sumMth("jobs")  : sumDay("jobs");
  const totalLost    = isYr ? sumMth("lostfound")   : sumDay("lostfound");
  const totalCls     = isYr ? sumMth("classifieds") : sumDay("classifieds");
  const totalArt     = isYr ? sumMth("articles")    : sumDay("articles");
  const totalUsr     = isYr
    ? [...userByMth.values()].reduce((s, v) => s + v, 0)
    : [...userByDate.values()].reduce((s, v) => s + v, 0);

  const grand = totalContent + (showUserStats ? totalUsr : 0);

  const cards = [
    { label: "Tổng tin · bài", value: totalContent, color: C.all   },
    { label: "Việc làm",       value: totalJobs,    color: C.jobs  },
    { label: "Tìm đồ rơi",    value: totalLost,    color: C.lost  },
    { label: "Mua bán",        value: totalCls,     color: C.cls   },
    { label: "Bài viết",       value: totalArt,     color: C.art   },
    ...(showUserStats ? [{ label: "Người dùng mới", value: totalUsr, color: C.usr }] : []),
  ];

  /* ── Period label ── */
  const now = new Date();
  const labels: Record<Mode, string> = {
    day:     `Hôm nay, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
    month:   `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`,
    quarter: `Quý ${Math.floor(now.getMonth() / 3) + 1}/${now.getFullYear()}`,
    year:    `Năm ${now.getFullYear()}`,
  };

  return (
    <div className="qp-chart-card" style={{ padding: "20px 22px" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="qp-chart-card__title">Thống kê</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.all }}>{labels[mode]}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
            {loading ? (
              <>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.jobs, display: "inline-block", animation: "qpPulse 0.9s infinite" }} />
                <span style={{ color: C.jobs }}>Đang tải…</span>
              </>
            ) : updatedAt ? (
              <>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                <span style={{ color: "#9ca3af" }}>{updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
              </>
            ) : null}
          </span>
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          {MODES.map((m) => {
            const active = m.key === mode;
            return (
              <button key={m.key} type="button" disabled={loading} onClick={() => handleMode(m.key)} style={{
                padding: "3px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: "1px solid", cursor: "pointer", lineHeight: "1.7", whiteSpace: "nowrap",
                transition: "all 0.15s",
                ...(active
                  ? { background: "var(--color-teal-pale,#e0f5f1)", borderColor: "var(--color-teal,#00A98F)", color: "var(--color-teal-dark,#007A68)" }
                  : { background: "transparent", borderColor: "#e5e7eb", color: "#6b7280" }),
              }}>
                {m.label}
              </button>
            );
          })}
          <button type="button" disabled={loading} onClick={() => load(mode)} title="Làm mới" style={{
            padding: "3px 9px", borderRadius: 999, fontSize: 14, fontWeight: 700,
            border: "1px solid #e5e7eb", cursor: "pointer", background: "transparent",
            color: "#9ca3af", lineHeight: "1.7", opacity: loading ? 0.3 : 1, transition: "opacity 0.15s",
          }}>↻</button>
        </div>
      </div>

      {/* ── Metric cards ───────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cards.length}, minmax(0,1fr))`, gap: 7, marginBottom: 18 }}>
        {cards.map(c => (
          <MetricCard key={c.label} label={c.label} value={c.value} outOf={grand} color={c.color} />
        ))}
      </div>

      {/* ── Mode content ───────────────────────────────────── */}
      <div style={{ opacity: loading ? 0.45 : 1, transition: "opacity 0.22s" }}>
        {mode === "day" && (
          <DayView data={daily} showUserStats={showUserStats} userCount={totalUsr} />
        )}

        {mode === "month" && (
          <>
            <LineChartView data={daily} showUserStats={showUserStats} userByDate={userByDate} gradId="gm" />
            <div style={{ marginTop: 20 }}>
              <CalendarGrid
                year={now.getFullYear()} month={now.getMonth() + 1}
                data={daily} showUserStats={showUserStats}
                userByDate={userByDate}
                selectedDate={selectedDate} onSelect={setSelectedDate}
              />
            </div>
          </>
        )}

        {mode === "quarter" && (
          <LineChartView data={daily} showUserStats={showUserStats} userByDate={userByDate} gradId="gq" />
        )}

        {mode === "year" && (
          <YearView monthly={monthly} showUserStats={showUserStats} userMonthly={userByMth} />
        )}
      </div>

      <style>{`
        @keyframes qpPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.35; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
