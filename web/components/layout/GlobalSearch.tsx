"use client";

// Tìm kiếm toàn cục — gõ là hiện kết quả mọi phân hệ (gợi ý nhanh), Enter mở trang kết quả.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cldUrl } from "@/lib/cloudinary-url";

type Hit = { module: string; moduleLabel: string; title: string; subtitle: string; href: string; image: string | null };
type Group = { module: string; moduleLabel: string; hits: Hit[] };

// Icon emoji theo phân hệ (client-safe — không import lib server).
const MODULE_ICON: Record<string, string> = {
  "tin-tuc": "📰", "tim-do-roi": "🔎", "viec-lam": "💼", "mua-ban": "🏷️",
  "di-tich": "🏛️", "cho": "🛒", "y-te": "🏥", "giao-thong": "🚌", "truong-hoc": "🎓",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();
  const total = groups.reduce((s, g) => s + g.hits.length, 0);

  // Tìm khi gõ (debounce 250ms).
  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const t = setTimeout(async () => {
      if (alive) setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data = await res.json();
        if (alive) setGroups(data.groups ?? []);
      } catch { if (alive) setGroups([]); }
      finally { if (alive) setLoading(false); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  // Đóng khi click ra ngoài / ESC.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function openSearch() { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }

  function goAll() {
    if (q.length < 1) return;
    setOpen(false);
    router.push(`/tim-kiem?q=${encodeURIComponent(q)}`);
  }

  function goHit(href: string) { setOpen(false); setQuery(""); router.push(href); }

  return (
    <div className="qp-search-wrap" ref={wrapRef}>
      <button className="qp-icon-btn" type="button" aria-label="Tìm kiếm" aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? setOpen(false) : openSearch())}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      </button>

      {open && (
        <div className="qp-search-pop is-global" role="dialog" aria-label="Tìm kiếm">
          <form className="qp-search-pop__bar" role="search" onSubmit={(e) => { e.preventDefault(); goAll(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input ref={inputRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm bài viết, việc làm, di tích, trường học…" aria-label="Tìm kiếm" />
            <button type="submit">Tìm</button>
          </form>

          {q.length >= 2 && (
            <div className="qp-search-results">
              {loading && total === 0 ? (
                <div className="qp-search-empty">Đang tìm…</div>
              ) : total === 0 ? (
                <div className="qp-search-empty">Không tìm thấy kết quả cho “{q}”.</div>
              ) : (
                <>
                  {groups.map((g) => (
                    <div className="qp-search-group" key={g.module}>
                      <div className="qp-search-group__head">{MODULE_ICON[g.module]} {g.moduleLabel}</div>
                      {g.hits.map((h) => (
                        <button type="button" key={h.href} className="qp-search-hit" onClick={() => goHit(h.href)}>
                          <span className="qp-search-hit__media">
                            {h.image
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={cldUrl(h.image, { w: 120 })} alt="" loading="lazy" />
                              : <span className="qp-search-hit__ph">{g.moduleLabel[0]}</span>}
                          </span>
                          <span className="qp-search-hit__text">
                            <span className="qp-search-hit__title">{h.title}</span>
                            <span className="qp-search-hit__sub">{h.subtitle}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                  <button type="button" className="qp-search-all" onClick={goAll}>Xem tất cả {total}+ kết quả cho “{q}” →</button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
