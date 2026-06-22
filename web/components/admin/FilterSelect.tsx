"use client";

// Dropdown kiểu Select2: có ô tìm kiếm bên trong, keyboard navigation, click ngoài để đóng.
// Dùng cho filter strip admin — compact hơn Combobox đầy đủ ở lostfound.
import { useEffect, useMemo, useRef, useState } from "react";

export type FilterOption = { value: string; label: string };

export function FilterSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Tìm…",
  showSearch = true,
}: {
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  // Focus ô search khi mở
  useEffect(() => {
    if (open && showSearch) searchRef.current?.focus();
  }, [open, showSearch]);

  const allOptions: FilterOption[] = [{ value: "", label: placeholder }, ...options];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((o) => o.label.toLowerCase().includes(q));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, options, placeholder]);

  const selected = options.find((o) => o.value === value);

  function toggle() {
    if (!open) { setQuery(""); setActive(0); }
    setOpen((v) => !v);
  }

  function pick(v: string) { onChange(v); setOpen(false); }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) pick(filtered[active].value); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
  }

  function onBtnKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
  }

  return (
    <div className={`qp-fsel${value ? " is-active" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="qp-fsel__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={onBtnKeyDown}
      >
        <span className="qp-fsel__label">{selected ? selected.label : placeholder}</span>
        <svg
          className={`qp-fsel__chev${open ? " is-open" : ""}`}
          width="12" height="12" viewBox="0 0 16 16"
          fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="qp-fsel__pop">
          {showSearch && (
            <div className="qp-fsel__search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                placeholder={searchPlaceholder}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={onSearchKeyDown}
              />
              {query && (
                <button type="button" className="qp-fsel__search-clear" aria-label="Xoá tìm kiếm" onClick={() => { setQuery(""); setActive(0); searchRef.current?.focus(); }}>
                  ✕
                </button>
              )}
            </div>
          )}
          <div className="qp-fsel__list" role="listbox">
            {filtered.length === 0 ? (
              <div className="qp-fsel__empty">Không tìm thấy</div>
            ) : (
              filtered.map((o, i) => (
                <div
                  key={o.value}
                  className={`qp-fsel__opt${i === active ? " is-hover" : ""}${o.value === value ? " is-selected" : ""}`}
                  role="option"
                  aria-selected={o.value === value}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
                >
                  {o.value === value && (
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M3 8l4 4 6-7" />
                    </svg>
                  )}
                  <span>{o.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
