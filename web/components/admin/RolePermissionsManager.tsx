"use client";

import React, { useState, useMemo } from "react";
import type { PermConfig, PermLevel } from "@/lib/role-permissions";
import { useToast } from "@/components/common/Toast";

const LEVELS: { value: PermLevel; label: string; desc: string }[] = [
  { value: "none", label: "Không",      desc: "Ẩn & chặn truy cập" },
  { value: "view", label: "Xem",        desc: "Chỉ xem danh sách" },
  { value: "edit", label: "Sửa",        desc: "Thêm + sửa, không xóa" },
  { value: "full", label: "Toàn quyền", desc: "Xem + thêm + sửa + xóa + duyệt" },
];

const LEVEL_BG: Record<PermLevel, string> = {
  none: "#94A3B8",
  view: "var(--color-indigo)",
  edit: "var(--color-teal-dark)",
  full: "var(--color-teal)",
};

const GROUP_ACCENT: Record<string, string> = {
  "Nội dung":    "var(--color-teal)",
  "Kiểm duyệt": "var(--color-warning)",
  "Dữ liệu":    "var(--color-indigo)",
  "Hệ thống":   "var(--color-navy)",
};

const GROUP_ICONS: Record<string, string> = {
  "Nội dung":    "◈",
  "Kiểm duyệt": "◉",
  "Dữ liệu":    "◆",
  "Hệ thống":   "◎",
};

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor" opacity=".8" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PillSelector({
  name,
  level,
  onChange,
}: {
  name: string;
  level: PermLevel;
  onChange: (v: PermLevel) => void;
}) {
  return (
    <div className="qp-perm-pills" role="group" aria-label={name}>
      {LEVELS.map((lv) => (
        <button
          key={lv.value}
          type="button"
          className={`qp-perm-pill qp-perm-pill--${lv.value}${level === lv.value ? " is-active" : ""}`}
          onClick={() => onChange(lv.value)}
          aria-pressed={level === lv.value}
          title={lv.desc}
        >
          {lv.label}
        </button>
      ))}
    </div>
  );
}

export function RolePermissionsManager({
  initialConfig,
  modules,
}: {
  initialConfig: PermConfig;
  modules: { key: string; label: string; group: string }[];
  adminPerms: Record<string, string>;
}) {
  const [config, setConfig] = useState<PermConfig>(initialConfig);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { toast } = useToast();

  const groups = useMemo(() => {
    const map = new Map<string, typeof modules>();
    for (const m of modules) {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    }
    return [...map.entries()];
  }, [modules]);

  function setLevel(key: string, level: PermLevel) {
    setConfig((prev) => ({ ...prev, editor: { ...prev.editor, [key]: level } }));
    setDirty(true);
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/role-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Lưu thất bại.");
        return;
      }
      toast.success("Đã lưu cấu hình phân quyền.");
      setDirty(false);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setConfig(initialConfig);
    setDirty(false);
  }

  return (
    <div className="qp-perm-wrap">

      {/* Legend */}
      <div className="qp-perm-legend">
        <span className="qp-perm-legend__label">Mức quyền:</span>
        {LEVELS.map((lv) => (
          <div key={lv.value} className="qp-perm-legend__item">
            <span className="qp-perm-legend__badge" style={{ background: LEVEL_BG[lv.value] }}>
              {lv.label}
            </span>
            <span className="qp-perm-legend__desc">{lv.desc}</span>
          </div>
        ))}
      </div>

      {/* Column header */}
      <div className="qp-perm-colhead">
        <div className="qp-perm-colhead__module">Module</div>
        <div className="qp-perm-colhead__role">
          <span className="qp-perm-avatar qp-perm-avatar--admin">A</span>
          <div>
            <strong>Admin</strong>
            <small>Không chỉnh được</small>
          </div>
        </div>
        <div className="qp-perm-colhead__role">
          <span className="qp-perm-avatar qp-perm-avatar--editor">BT</span>
          <div>
            <strong>Biên tập viên</strong>
            <small>Có thể cấu hình</small>
          </div>
        </div>
      </div>

      {/* Cards per group */}
      <div className="qp-perm-groups">
        {groups.map(([group, mods]) => (
          <div
            key={group}
            className="qp-perm-card"
            style={{ "--perm-accent": GROUP_ACCENT[group] ?? "var(--color-teal)" } as React.CSSProperties}
          >
            {/* Card header */}
            <div className="qp-perm-card__head">
              <span className="qp-perm-card__icon">{GROUP_ICONS[group] ?? "◇"}</span>
              <span className="qp-perm-card__name">{group}</span>
              <span className="qp-perm-card__count">{mods.length}</span>
            </div>

            {/* Module rows */}
            {mods.map((m) => {
              const level = (config.editor[m.key as keyof typeof config.editor] ?? "none") as PermLevel;
              return (
                <div key={m.key} className="qp-perm-row">
                  <div className="qp-perm-row__module">{m.label}</div>
                  <div className="qp-perm-row__admin">
                    <span className="qp-perm-lock-badge">
                      <LockIcon />
                      Toàn quyền
                    </span>
                  </div>
                  <div className="qp-perm-row__editor">
                    <PillSelector
                      name={`editor-${m.key}`}
                      level={level}
                      onChange={(v) => setLevel(m.key, v)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="qp-perm-footer">
        <p className="type-body-small text-muted">
          Thay đổi có hiệu lực ngay sau khi lưu. Biên tập viên cần đăng nhập lại để thấy menu cập nhật.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {dirty && (
            <button type="button" className="qp-btn-outline" onClick={reset}>
              Huỷ thay đổi
            </button>
          )}
          <button
            type="button"
            className="qp-btn-primary"
            onClick={save}
            disabled={busy || !dirty}
          >
            {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
