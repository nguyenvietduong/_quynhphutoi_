"use client";

// Tải nhiều ảnh — chọn từ máy, upload lên /api/upload, hiện thumbnail, xoá được.
// Controlled: value = mảng URL, onChange cập nhật.
import { useRef, useState } from "react";
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB, IMAGE_ACCEPT, isAllowedImageType, formatMB } from "@/lib/upload-limits";
import { useToast } from "@/components/common/Toast";

export function ImageUploader({ value, onChange, max = 6, subfolder }: { value: string[]; onChange: (urls: string[]) => void; max?: number; subfolder?: string }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const room = max - value.length;
    if (room <= 0) { toast.error(`Tối đa ${max} ảnh.`); return; }

    // Validate ngay tại client (trước khi upload) để khỏi tốn băng thông / chờ lâu
    // rồi mới bị server từ chối. Server vẫn kiểm tra lại — đây chỉ là chốt sớm.
    const picked = files.slice(0, room);
    const badType = picked.find((f) => !isAllowedImageType(f.type));
    if (badType) { toast.error(`"${badType.name}" không phải ảnh JPG/PNG/WEBP/GIF.`); if (inputRef.current) inputRef.current.value = ""; return; }
    const tooBig = picked.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) { toast.error(`"${tooBig.name}" nặng ${formatMB(tooBig.size)} — vượt giới hạn ${MAX_IMAGE_MB}MB mỗi ảnh.`); if (inputRef.current) inputRef.current.value = ""; return; }

    setUploading(true);
    try {
      const fd = new FormData();
      picked.forEach((f) => fd.append("files", f));
      if (subfolder) fd.append("subfolder", subfolder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Tải ảnh thất bại."); return; }
      onChange([...value, ...(data.urls as string[])].slice(0, max));
    } catch { toast.error("Lỗi kết nối khi tải ảnh."); } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(url: string) { onChange(value.filter((u) => u !== url)); }

  return (
    <div className="qp-uploader">
      <div className="qp-uploader__grid">
        {value.map((url) => (
          <div key={url} className="qp-uploader__item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Ảnh đã tải" />
            <button type="button" className="qp-uploader__del" aria-label="Xoá ảnh" onClick={() => remove(url)}>×</button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" className="qp-uploader__add" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <span className="qp-uploader__spin" aria-hidden />
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                <span>Thêm ảnh</span>
              </>
            )}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={onPick} />
      <p className="qp-uploader__hint">{value.length}/{max} ảnh · JPG/PNG/WEBP, tối đa {MAX_IMAGE_MB}MB mỗi ảnh.</p>
    </div>
  );
}
