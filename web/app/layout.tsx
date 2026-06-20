import type { Metadata } from "next";
import Script from "next/script";
import { SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { Be_Vietnam_Pro, Space_Grotesk, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/styles/account.css";
import "@/styles/rich-text-editor.css";
import { ToastProvider } from "@/components/common/Toast";
import { Analytics } from "@vercel/analytics/next";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-source-serif",
  display: "swap",
});

// Từ khoá gốc mặc định (dùng khi admin chưa nhập "Từ khoá gốc" ở tab SEO).
const DEFAULT_KEYWORDS = [
  "Quỳnh Phụ", "Thái Bình", "cổng thông tin Quỳnh Phụ", "tin tức Quỳnh Phụ",
  "việc làm Quỳnh Phụ", "mua bán Quỳnh Phụ", "tìm đồ rơi", "trường học Quỳnh Phụ",
  "y tế Quỳnh Phụ", "giao thông Quỳnh Phụ", "di tích Quỳnh Phụ", "chợ Quỳnh Phụ",
];

// Metadata gốc toàn site — đọc cấu hình SEO admin (DB). Để trống ô nào → dùng mặc định SITE.
// Áp dụng ngay cho lượt truy cập tiếp theo (không cần build lại).
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const name = s.seoSiteName || SITE.name;
  const description = s.seoSiteDescription || SITE.description;
  const keywords = s.seoDefaultKeywords
    ? s.seoDefaultKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS;
  const ogImage = s.seoDefaultOgImage
    ? (s.seoDefaultOgImage.startsWith("http") ? s.seoDefaultOgImage : `${SITE.url}${s.seoDefaultOgImage}`)
    : `${SITE.url}/opengraph-image`;
  // Icon tab trình duyệt: ưu tiên logo nhỏ, rồi logo chính, cuối cùng là logo mặc định.
  const iconUrl = s.siteFavicon || s.siteLogo || "/img/patterns/logo.png";
  const verification =
    s.seoVerificationGoogle || s.seoVerificationBing
      ? {
          ...(s.seoVerificationGoogle ? { google: s.seoVerificationGoogle } : {}),
          ...(s.seoVerificationBing ? { other: { "msvalidate.01": s.seoVerificationBing } } : {}),
        }
      : undefined;

  return {
    metadataBase: new URL(SITE.url),
    title: { default: name, template: `%s · ${name}` },
    description,
    applicationName: name,
    authors: [{ name }],
    keywords,
    alternates: { canonical: "/", types: { "application/rss+xml": "/feed.xml" } },
    manifest: "/manifest.webmanifest",
    icons: { icon: iconUrl, apple: iconUrl, shortcut: iconUrl },
    ...(verification ? { verification } : {}),
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      type: "website",
      siteName: name,
      title: name,
      description,
      url: SITE.url,
      locale: SITE.locale,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: name, description, images: [ogImage] },
  };
}

// Root layout TỐI GIẢN — chỉ <html>/<body>, fonts & CSS toàn cục.
// Chrome (TopBar/Marquee/Footer) nằm ở app/(site)/layout.tsx.
// Trang đăng nhập app/(auth)/ có layout sạch riêng — không chrome.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const fontVars = `${beVietnam.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${sourceSerif.variable}`;
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return (
    <html lang="vi" className={fontVars} suppressHydrationWarning>
      <body suppressHydrationWarning><ToastProvider>{children}</ToastProvider><Analytics /></body>
      {/* Google Analytics 4 — chỉ tải khi đã cấu hình Measurement ID (G-XXXXXXXXXX). */}
      {gaId && (
        <>
          <Script
            id="ga-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
          <Script
            id="ga-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
            }}
          />
        </>
      )}
      {/* reCAPTCHA v2 (ô tick) — chỉ tải khi đã cấu hình site key. Render tường minh ở component. */}
      {recaptchaKey && (
        <Script
          id="recaptcha-v2"
          strategy="afterInteractive"
          src="https://www.google.com/recaptcha/api.js?hl=vi"
        />
      )}
      {/* Loader AdSense — chỉ tải khi đã cấu hình publisher ID (fallback chỗ chưa bán) */}
      {adsenseClient && (
        <Script
          id="adsbygoogle-init"
          async
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
        />
      )}
    </html>
  );
}
