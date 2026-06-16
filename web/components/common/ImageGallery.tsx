"use client";

// Thư viện ảnh trang chi tiết: 1 ảnh lớn + dải ảnh nhỏ bên dưới.
// Bấm vào ảnh nhỏ thì ảnh lớn đổi theo. 1 ảnh thì ẩn dải thumbnail.
import { useState } from "react";
import { cldUrl } from "@/lib/cloudinary-url";

export function ImageGallery({ images, alt = "" }: { images: string[]; alt?: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  const idx = Math.min(active, images.length - 1);

  return (
    <div className="qp-gallery">
      <div className="qp-gallery__main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cldUrl(images[idx], { w: 1200 })} alt={alt || `Ảnh ${idx + 1}`} />
        {images.length > 1 && (
          <span className="qp-gallery__counter" aria-hidden>{idx + 1}/{images.length}</span>
        )}
      </div>
      {images.length > 1 && (
        <div className="qp-gallery__thumbs" role="tablist" aria-label="Ảnh khác">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Xem ảnh ${i + 1}`}
              className={`qp-gallery__thumb${i === idx ? " is-active" : ""}`}
              onClick={() => setActive(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cldUrl(src, { w: 160 })} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
