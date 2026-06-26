import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo";

// Ảnh chia sẻ mặc định cho toàn site (Next tự áp cho route không có ảnh riêng).
export const runtime = "nodejs";
export const alt = SITE.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Tải font Be Vietnam Pro (TTF) để render dấu tiếng Việt. UA cũ → Google trả .ttf
// (satori không đọc woff2). Lỗi mạng → trả null, dùng font mặc định (vẫn ra ảnh).
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@700;800&text=${encodeURIComponent(text)}`;
    const css = await fetch(api, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.30 (KHTML, like Gecko) Chrome/12.0.742.122 Safari/534.30",
      },
    }).then((r) => r.text());
    const url = css.match(/src:\s*url\((https:[^)]+)\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const title = SITE.name;
  const sub = `quynhphutoi.com · ${SITE.region}, ${SITE.province}`;
  const data = await loadFont(`${title} ${sub} Kết nối cộng đồng`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #062340 0%, #0F4C81 60%, #007D69 100%)",
          color: "#ffffff",
          fontFamily: data ? "BeVietnam" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#FCD34D" }} />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2, color: "#FCD34D" }}>
            TRANG CỘNG ĐỒNG QUỲNH PHỤ
          </div>
        </div>
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>{title}</div>
        <div style={{ fontSize: 36, fontWeight: 700, marginTop: 30, color: "#CFE3F5" }}>{sub}</div>
        <div
          style={{
            position: "absolute",
            bottom: 70,
            right: 80,
            width: 220,
            height: 220,
            borderRadius: 9999,
            background: "rgba(252,211,77,0.14)",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: data
        ? [
            { name: "BeVietnam", data, weight: 700 as const, style: "normal" as const },
            { name: "BeVietnam", data, weight: 800 as const, style: "normal" as const },
          ]
        : [],
    },
  );
}
