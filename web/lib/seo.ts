// Trung tâm SEO — 1 nguồn sự thật cho domain, helper dựng Metadata (OpenGraph/Twitter/
// canonical/robots) và các builder JSON-LD (schema.org) cho mọi module.
// Trang chi tiết bài viết (lib/articles.ts) đã có builder riêng — file này lấy SITE chung.
import type { Metadata } from "next";
import type { JobDoc } from "@/lib/jobs";
import type { ClassifiedDoc } from "@/lib/classifieds";
import type { LostFoundDoc } from "@/lib/lostfound";
import type { SchoolDoc } from "@/lib/schools";
import type { HealthDoc } from "@/lib/health";
import type { TransitDoc } from "@/lib/transit";
import type { RelicDoc } from "@/lib/relics";
import type { MarketDoc } from "@/lib/market";
import type { AdDoc } from "@/lib/ads";
import type { AppSettings } from "@/lib/settings";

export const SITE = {
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.quynhphutoi.io.vn").replace(/\/$/, ""),
  name: "Quỳnh Phụ Tôi",
  shortName: "Quỳnh Phụ Tôi",
  description:
    "Kênh thông tin cộng đồng xã Quỳnh Phụ (Thái Bình) — tin tức, việc làm, mua bán, tìm đồ rơi, trường học, y tế, giao thông, di tích và kết nối cộng đồng.",
  locale: "vi_VN",
  logo: "/img/patterns/logo.png",
  region: "Xã Quỳnh Phụ",
  province: "Thái Bình",
} as const;

// URL tuyệt đối từ đường dẫn nội bộ ("/x") hoặc trả nguyên nếu đã là http(s).
export function abs(path: string): string {
  if (!path) return SITE.url;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE.url}${path.startsWith("/") ? "" : "/"}${path}`;
}

type BuildMetaInput = {
  title: string;
  description: string;
  path: string;                       // "/viec-lam/abc"
  image?: string | null;              // url tương đối hoặc tuyệt đối; rỗng → dùng opengraph-image mặc định
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  keywords?: string[];
  publishedTime?: string;             // ISO
  modifiedTime?: string;              // ISO
};

// Dựng Metadata chuẩn cho MỌI trang (listing/static/detail). metadataBase ở app/layout.tsx
// giúp canonical & ảnh tương đối tự thành tuyệt đối.
export function buildMetadata(o: BuildMetaInput): Metadata {
  const desc = (o.description || SITE.description).trim().slice(0, 200);
  // Luôn có og:image: ảnh riêng của trang, hoặc ảnh OG động mặc định (/opengraph-image).
  // (Next thay thế chứ không merge openGraph giữa các segment, nên phải tự set ở đây.)
  const imgUrl = o.image ? abs(o.image) : `${SITE.url}/opengraph-image`;
  return {
    title: o.title,
    description: desc,
    keywords: o.keywords?.length ? o.keywords : undefined,
    alternates: { canonical: o.path },
    robots: o.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: o.type ?? "website",
      url: o.path,
      siteName: SITE.name,
      title: o.title,
      description: desc,
      locale: SITE.locale,
      images: [{ url: imgUrl }],
      ...(o.publishedTime ? { publishedTime: o.publishedTime } : {}),
      ...(o.modifiedTime ? { modifiedTime: o.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: o.title,
      description: desc,
      images: [imgUrl],
    },
  };
}

// ─────────────────────────── JSON-LD builders ───────────────────────────
const absImg = (u?: string | null) => (u ? abs(u) : undefined);
const firstImg = (imgs?: string[] | null) => (imgs && imgs.length ? absImg(imgs[0]) : undefined);

// Địa chỉ bưu chính chuẩn schema.org (đường + huyện + tỉnh).
function postalAddress(street?: string, locality?: string) {
  return {
    "@type": "PostalAddress",
    ...(street ? { streetAddress: street } : {}),
    addressLocality: locality || SITE.region,
    addressRegion: SITE.province,
    addressCountry: "VN",
  };
}
const geo = (c?: { lat: number; lng: number }) =>
  c ? { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng } : undefined;

export function jsonLdWebSite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    description: SITE.description,
    inLanguage: "vi-VN",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/tim-kiem?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function jsonLdOrganization(s?: Partial<AppSettings>) {
  const sameAs = [s?.socialFacebook, s?.socialYoutube, s?.socialZalo].filter(Boolean) as string[];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    logo: abs(s?.siteLogo || SITE.logo),
    description: SITE.description,
    areaServed: `${SITE.region}, ${SITE.province}`,
    ...(sameAs.length ? { sameAs } : {}),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      ...(s?.contactHotline ? { telephone: s.contactHotline } : {}),
      ...(s?.contactEmail ? { email: s.contactEmail } : {}),
      areaServed: "VN",
      availableLanguage: ["vi"],
    },
  };
}

export function jsonLdBreadcrumb(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

const EMPLOYMENT: Record<string, string> = {
  "toan-thoi-gian": "FULL_TIME",
  "ban-thoi-gian": "PART_TIME",
  "thoi-vu": "TEMPORARY",
  "thuc-tap": "INTERN",
};

export function jsonLdJob(j: JobDoc, descText: string, locality?: string) {
  const salary = j.salary || {};
  const hasSalary = (salary.min ?? null) !== null || (salary.max ?? null) !== null;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.title,
    description: descText,
    datePosted: j.createdAt?.toISOString(),
    ...(j.deadline ? { validThrough: new Date(j.deadline).toISOString() } : {}),
    ...(EMPLOYMENT[j.jobType] ? { employmentType: EMPLOYMENT[j.jobType] } : {}),
    hiringOrganization: { "@type": "Organization", name: j.company },
    jobLocation: { "@type": "Place", address: postalAddress(j.location?.address, locality) },
    ...(j.industryLabel ? { industry: j.industryLabel } : {}),
    ...(j.quantity ? { totalJobOpenings: j.quantity } : {}),
    ...(hasSalary
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "VND",
            value: {
              "@type": "QuantitativeValue",
              ...(salary.min != null ? { minValue: salary.min } : {}),
              ...(salary.max != null ? { maxValue: salary.max } : {}),
              unitText: "MONTH",
            },
          },
        }
      : {}),
    ...(firstImg(j.images) ? { image: firstImg(j.images) } : {}),
    directApply: true,
    identifier: { "@type": "PropertyValue", name: j.company, value: j.slug },
    url: abs(`/viec-lam/${j.slug}`),
  };
}

export function jsonLdClassified(c: ClassifiedDoc, descText: string) {
  const avail = c.status === "sold" ? "https://schema.org/SoldOut"
    : c.status === "open" ? "https://schema.org/InStock"
    : "https://schema.org/Discontinued";
  const itemCondition = c.condition === "moi"
    ? "https://schema.org/NewCondition"
    : c.condition === "da-dung" ? "https://schema.org/UsedCondition" : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: c.title,
    description: descText,
    category: c.categoryLabel,
    ...(c.images?.length ? { image: c.images.map((i) => abs(i)) } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "VND",
      price: (c.priceText || "").replace(/[^\d]/g, "") || undefined,
      ...(itemCondition ? { itemCondition } : {}),
      availability: avail,
      seller: { "@type": "Person", name: c.postedByName },
      url: abs(`/mua-ban/${c.slug}`),
    },
  };
}

export function jsonLdLostFound(p: LostFoundDoc, descText: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: descText,
    articleSection: p.kind === "tim-do" ? "Tìm đồ thất lạc" : "Nhặt được đồ",
    datePublished: p.createdAt?.toISOString(),
    dateModified: p.updatedAt?.toISOString(),
    ...(p.images?.length ? { image: p.images.map((i) => abs(i)) } : {}),
    author: { "@type": "Person", name: p.postedByName },
    mainEntityOfPage: { "@type": "WebPage", "@id": abs(`/tim-do-roi/${p.slug}`) },
  };
}

export function jsonLdSchool(s: SchoolDoc, descText: string, locality?: string) {
  return {
    "@context": "https://schema.org",
    "@type": s.type === "gdnn-gdtx" ? "EducationalOrganization" : "School",
    name: s.name,
    ...(descText ? { description: descText } : {}),
    url: abs(`/truong-hoc/${s.slug}`),
    address: postalAddress(s.address, locality),
    ...(s.phone ? { telephone: s.phone } : {}),
    ...(s.email ? { email: s.email } : {}),
    ...(s.website ? { sameAs: [s.website] } : {}),
    ...(s.foundedYear ? { foundingDate: String(s.foundedYear) } : {}),
    ...(geo(s.coords) ? { geo: geo(s.coords) } : {}),
  };
}

export function jsonLdHealth(h: HealthDoc, descText: string, locality?: string) {
  const type = h.type === "benh-vien" ? "Hospital"
    : h.type === "nha-thuoc" ? "Pharmacy"
    : h.type === "phong-kham" ? "MedicalClinic" : "MedicalOrganization";
  return {
    "@context": "https://schema.org",
    "@type": type,
    name: h.name,
    ...(descText ? { description: descText } : {}),
    url: abs(`/y-te/${h.slug}`),
    address: postalAddress(h.address, locality),
    ...(h.phone ? { telephone: h.phone } : {}),
    ...(h.email ? { email: h.email } : {}),
    ...(h.website ? { sameAs: [h.website] } : {}),
    ...(h.hours ? { openingHours: h.hours } : {}),
    ...(h.specialties ? { medicalSpecialty: h.specialties } : {}),
    ...(geo(h.coords) ? { geo: geo(h.coords) } : {}),
  };
}

export function jsonLdTransit(t: TransitDoc, descText: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BusTrip",
    name: t.name,
    ...(descText ? { description: descText } : {}),
    ...(t.operator ? { provider: { "@type": "Organization", name: t.operator, ...(t.phone ? { telephone: t.phone } : {}) } } : {}),
    departureBusStop: { "@type": "BusStop", name: t.origin },
    arrivalBusStop: { "@type": "BusStop", name: t.destination },
    url: abs(`/giao-thong/${t.slug}`),
  };
}

export function jsonLdRelic(r: RelicDoc, descText: string, locality?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: r.name,
    ...(descText ? { description: descText } : {}),
    url: abs(`/di-tich/${r.slug}`),
    address: postalAddress(r.address, locality),
    ...(r.images?.length ? { image: r.images.map((i) => abs(i)) } : {}),
    ...(r.era ? { temporalCoverage: r.era } : {}),
    isAccessibleForFree: true,
    touristType: "Văn hoá · Lịch sử · Tâm linh",
  };
}

// Quảng cáo (nhà tài trợ trực tiếp) — mô tả như một doanh nghiệp địa phương + nhãn tài trợ.
export function jsonLdAd(a: AdDoc, descText: string) {
  const imgs = (a.images?.length ? a.images : a.imageDesktop ? [a.imageDesktop] : []).map((i) => abs(i));
  const id = a._id ? a._id.toString() : "";
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: a.advertiser,
    slogan: a.title,
    ...(descText ? { description: descText } : {}),
    ...(imgs.length ? { image: imgs } : {}),
    ...(a.phone ? { telephone: a.phone } : {}),
    ...(a.address
      ? { address: { "@type": "PostalAddress", streetAddress: a.address, addressRegion: SITE.province, addressCountry: "VN" } }
      : {}),
    ...(a.linkUrl ? { sameAs: [a.linkUrl] } : {}),
    url: abs(`/quang-cao/${id}`),
  };
}

export function jsonLdMarket(m: MarketDoc, descText: string, locality?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: m.name,
    ...(descText ? { description: descText } : {}),
    url: abs(`/cho/${m.slug}`),
    address: postalAddress(m.address, locality),
    ...(m.schedule ? { openingHours: m.schedule } : {}),
    ...(m.contactPhone ? { telephone: m.contactPhone } : {}),
    ...(m.priceText ? { priceRange: m.priceText } : {}),
  };
}
