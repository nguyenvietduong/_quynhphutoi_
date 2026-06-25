"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useToast } from "@/components/common/Toast";
import { Pagination } from "@/components/common/Pagination";
import { usePagination, PageSizeControl } from "@/components/admin/AdminPaging";
import { FilterSelect, type FilterOption } from "@/components/admin/FilterSelect";
import { cldUrl } from "@/lib/cloudinary-url";
import { MODULE_LABELS } from "@/lib/media-modules";
import { hasPerm, type PermLevel } from "@/lib/perm";
import type { MediaAsset } from "@/lib/media";

const FORMAT_OPTS: FilterOption[] = [
  { value: "jpg",  label: "JPG" },
  { value: "png",  label: "PNG" },
  { value: "webp", label: "WEBP" },
  { value: "gif",  label: "GIF" },
];

const MODULE_OPTS: FilterOption[] = Object.entries(MODULE_LABELS).map(([v, label]) => ({ value: v, label }));

type CloudState = { assets: MediaAsset[]; nextCursor?: string; loading: boolean; error: string | null };
type MigrateState = { status: "idle" | "running" | "done" | "error"; result?: string; previewCount?: number };

export function MediaManager({ configured, perm = "full" }: { configured: boolean; perm?: PermLevel }) {
  const canUpload = hasPerm(perm, "edit");
  const canDelete = hasPerm(perm, "full");
  const canMigrate = hasPerm(perm, "full");
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [fFormat, setFFormat] = useState("");
  const [fModule, setFModule] = useState("");
  const [cloud, setCloud] = useState<CloudState>({ assets: [], nextCursor: undefined, loading: false, error: null });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [migrate, setMigrate] = useState<MigrateState>({ status: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCloud = useCallback(async (query: string, module: string, cursor?: string, append = false) => {
    setCloud((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (module) params.set("subfolder", module);
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/admin/media?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setCloud((s) => ({ ...s, loading: false, error: data.error || "Lỗi tải ảnh." })); return; }
      setCloud((s) => ({
        assets: append ? [...s.assets, ...(data.assets ?? [])] : (data.assets ?? []),
        nextCursor: data.nextCursor,
        loading: false,
        error: null,
      }));
    } catch {
      setCloud((s) => ({ ...s, loading: false, error: "Không thể kết nối máy chủ." }));
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    fetchCloud("", "");
    // Tự động kiểm tra ảnh cần migrate khi load trang
    runMigrate(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  function onSearchChange(val: string) {
    setQ(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchCloud(val, fModule, undefined, false), 350);
  }

  function onModuleChange(val: string) {
    setFModule(val);
    fetchCloud(q, val, undefined, false);
  }

  const filtered = useMemo(() => {
    if (!fFormat) return cloud.assets;
    return cloud.assets.filter((a) => a.format.toLowerCase() === fFormat);
  }, [cloud.assets, fFormat]);

  const pg = usePagination(filtered, 24);
  const hasFilter = !!(fFormat || fModule);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("files", f));
      if (fModule) form.append("subfolder", fModule);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Tải ảnh thất bại."); return; }
      toast.success(`Đã tải lên ${(data.urls as string[]).length} ảnh.`);
      fetchCloud(q, fModule, undefined, false);
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function confirmDelete() {
    if (!confirmId) return;
    setDeleting(confirmId);
    setConfirmId(null);
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: confirmId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Xoá thất bại."); return; }
      setCloud((s) => ({ ...s, assets: s.assets.filter((a) => a.publicId !== confirmId) }));
      toast.success("Đã xoá ảnh.");
    } finally { setDeleting(null); }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    } catch { toast.error("Không thể copy URL."); }
  }

  async function runMigrate(dryRun: boolean) {
    setMigrate({ status: "running" });
    try {
      const res = await fetch("/api/admin/media/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMigrate({ status: "error", result: data.error || "Lỗi migration." }); return; }
      if (dryRun) {
        const count = data.preview ?? 0;
        setMigrate({
          status: "done",
          previewCount: count,
          result: count > 0
            ? `Phát hiện ${count} ảnh cần di chuyển. Nhấn "Chạy migration" để thực hiện.`
            : "Tất cả ảnh đã ở đúng thư mục, không cần di chuyển.",
        });
      } else {
        setMigrate({ status: "done", previewCount: 0, result: `Hoàn thành: đã di chuyển ${data.migrated} ảnh.` });
        fetchCloud(q, fModule, undefined, false);
      }
    } catch { setMigrate({ status: "error", result: "Lỗi kết nối." }); }
  }

  const fmtBytes = (b: number) =>
    b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

  if (!configured) {
    return (
      <div className="qp-acc-card" style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "var(--color-gray-text)" }}>
          Cần thêm <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, <code>CLOUDINARY_API_SECRET</code> vào <code>.env.local</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="qp-acc-page">

      {/* Toolbar */}
      <div className="qp-admin-toolbar">
        <input
          className="qp-input qp-admin-toolbar__search"
          placeholder="Tìm theo tên file..."
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <span className="qp-admin-toolbar__spacer" />
        <button
          type="button"
          className="qp-btn-outline"
          onClick={() => fetchCloud(q, fModule, undefined, false)}
          disabled={cloud.loading}
        >
          {cloud.loading && cloud.assets.length === 0 ? "Đang tải..." : "Làm mới"}
        </button>
        {canUpload && (
          <>
            <button
              type="button"
              className="qp-btn-primary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Đang tải lên..." : "+ Tải ảnh lên"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleUpload(e.target.files)} />
          </>
        )}
      </div>

      {/* Filter strip */}
      <div className="qp-filter-strip">
        <FilterSelect
          options={MODULE_OPTS}
          value={fModule}
          onChange={onModuleChange}
          placeholder="Tất cả module"
          searchPlaceholder="Tìm module..."
        />
        <FilterSelect
          options={FORMAT_OPTS}
          value={fFormat}
          onChange={setFFormat}
          placeholder="Tất cả định dạng"
          showSearch={false}
        />
        {hasFilter && (
          <button
            type="button"
            className="qp-filter-strip__clear"
            onClick={() => { setFFormat(""); setFModule(""); fetchCloud(q, "", undefined, false); }}
          >
            Xoá bộ lọc
          </button>
        )}
        <span className="qp-filter-strip__spacer" />
        <PageSizeControl value={pg.pageSize} onChange={pg.setPageSize} total={filtered.length} />
      </div>

      {/* Panel di chuyển ảnh cũ — chỉ hiện khi có quyền full và có ảnh cần migrate */}
      {canMigrate && (migrate.status === "running" || (migrate.status === "done" && (migrate.previewCount ?? 0) > 0)) && (
        <div className="qp-acc-card" style={{ marginBottom: 16, padding: "12px 16px", borderLeft: "3px solid var(--color-warning, #f59e0b)" }}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 6px" }}>
            {migrate.status === "running" ? "Đang kiểm tra ảnh cũ..." : `Có ${migrate.previewCount} ảnh cần di chuyển vào thư mục module`}
          </p>
          {migrate.status === "done" && (
            <p style={{ fontSize: 13, color: "var(--color-gray-text)", margin: "0 0 12px" }}>
              Ảnh đang nằm trong <code>quynhphu/</code> sẽ được di chuyển vào <code>quynhphu/tin-tuc/</code>, <code>quynhphu/truong-hoc/</code>... URL trong cơ sở dữ liệu cũng được cập nhật tự động.
            </p>
          )}
          {migrate.status === "done" && (
            <button
              type="button"
              className="qp-btn-primary"
              style={{ background: "var(--color-warning, #f59e0b)", borderColor: "var(--color-warning, #f59e0b)" }}
              onClick={() => {
                if (window.confirm("Chắc chắn chạy migration thật? Thao tác này sẽ đổi tên ảnh trên Cloudinary và cập nhật toàn bộ cơ sở dữ liệu.")) {
                  runMigrate(false);
                }
              }}
            >
              Chạy migration ({migrate.previewCount} ảnh)
            </button>
          )}
        </div>
      )}

      {cloud.error && <p style={{ color: "var(--color-error)", marginBottom: 12 }}>{cloud.error}</p>}

      {/* Skeleton loading */}
      {cloud.loading && cloud.assets.length === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="qp-acc-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ aspectRatio: "4/3", background: "var(--color-bg-muted, #f3f4f6)" }} />
              <div style={{ padding: "8px 10px" }}>
                <div style={{ height: 12, background: "var(--color-bg-muted, #f3f4f6)", borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 10, width: "60%", background: "var(--color-bg-muted, #f3f4f6)", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trống */}
      {!cloud.loading && filtered.length === 0 && !cloud.error && (
        <div className="qp-empty">
          <div className="qp-empty__title">Không có ảnh</div>
          <p className="type-body-small">
            {q || fFormat || fModule ? "Thử xoá bộ lọc hoặc thay đổi từ khoá." : "Nhấn \"Tải ảnh lên\" để thêm ảnh mới."}
          </p>
        </div>
      )}

      {/* Grid ảnh */}
      {pg.paged.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {pg.paged.map((a) => (
            <div key={a.publicId} className="qp-acc-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ position: "relative", aspectRatio: "4/3", background: "var(--color-bg-muted, #f3f4f6)" }}>
                <Image
                  src={cldUrl(a.url, { w: 360 })}
                  alt={a.publicId.split("/").pop() ?? ""}
                  fill
                  sizes="220px"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </div>
              <div style={{ padding: "8px 10px" }}>
                <p style={{ fontSize: 12, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.publicId}>
                  {a.publicId.split("/").pop()}
                </p>
                <p style={{ fontSize: 11, color: "var(--color-gray-text)", margin: "0 0 8px" }}>
                  {a.width}x{a.height} · {fmtBytes(a.bytes)} · {a.format.toUpperCase()}
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => copyUrl(a.url)}
                    style={{
                      flex: 1, fontSize: 12, padding: "3px 0",
                      border: "1px solid var(--color-border)", borderRadius: 6,
                      background: copied === a.url ? "var(--color-teal-light, #e6faf7)" : "none",
                      cursor: "pointer",
                      color: copied === a.url ? "var(--color-teal)" : "inherit",
                    }}
                  >
                    {copied === a.url ? "Đã copy" : "Copy URL"}
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmId(a.publicId)}
                      disabled={deleting === a.publicId}
                      style={{
                        fontSize: 12, padding: "3px 8px",
                        border: "1px solid var(--color-border)", borderRadius: 6,
                        background: "none", cursor: "pointer",
                        color: "var(--color-error, #ef4444)",
                      }}
                    >
                      {deleting === a.publicId ? "..." : "Xoá"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phân trang */}
      {pg.totalPages > 1 && (
        <Pagination page={pg.page} totalPages={pg.totalPages} onPage={pg.setPage} />
      )}

      {/* Tải thêm từ Cloudinary */}
      {cloud.nextCursor && !cloud.loading && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button type="button" className="qp-btn-outline" onClick={() => fetchCloud(q, fModule, cloud.nextCursor, true)}>
            Tải thêm ảnh từ Cloudinary
          </button>
        </div>
      )}
      {cloud.loading && cloud.assets.length > 0 && (
        <p style={{ textAlign: "center", marginTop: 12, color: "var(--color-gray-text)" }}>Đang tải...</p>
      )}

      {/* Modal xác nhận xoá */}
      {confirmId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)" }} onClick={() => setConfirmId(null)} />
          <div className="qp-acc-card" style={{ position: "relative", maxWidth: 360, width: "90%", padding: 28, zIndex: 1 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Xác nhận xoá ảnh?</p>
            <p style={{ fontSize: 13, color: "var(--color-gray-text)", marginBottom: 20, wordBreak: "break-all" }}>
              {confirmId.split("/").pop()}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="qp-btn-primary"
                style={{ background: "var(--color-error, #ef4444)", borderColor: "var(--color-error, #ef4444)" }}
                onClick={confirmDelete}
              >
                Xoá
              </button>
              <button type="button" className="qp-btn-outline" onClick={() => setConfirmId(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
