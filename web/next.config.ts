import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Loader tuỳ biến: ảnh Cloudinary lấy thẳng CDN kèm f_auto,q_auto,w (xem lib/cloudinary-loader.ts);
    // ảnh khác trả nguyên. Bỏ được hop qua bộ tối ưu /_next/image của Vercel.
    loader: "custom",
    loaderFile: "./lib/cloudinary-loader.ts",
    // Ảnh minh hoạ tin tức lấy từ loremflickr (ảnh Flickr thật theo từ khoá).
    remotePatterns: [
      { protocol: "https", hostname: "loremflickr.com" },
      { protocol: "https", hostname: "*.staticflickr.com" },
      // Ảnh upload lưu trên Cloudinary.
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
