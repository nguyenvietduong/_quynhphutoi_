import { pageMetadata } from "@/lib/page-seo";
import { JsonLd } from "@/components/common/JsonLd";
import { jsonLdBreadcrumb } from "@/lib/seo";
import Link from "next/link";
import { listClassifieds, listMyClassifieds, countClassifieds, type ClassifiedDoc } from "@/lib/classifieds";
import { getSession } from "@/lib/auth";
import { getAdminUnitsMap, type AdminUnit } from "@/lib/admin-units";
import { stripHtml } from "@/lib/strip-html";
import { ClassifiedBrowser, type ClassifiedItem } from "@/components/classifieds/ClassifiedBrowser";
import { listActiveCategoryOptions } from "@/lib/categories";
import { getSettings } from "@/lib/settings";

export async function generateMetadata() {
  return pageMetadata({
    key: "/mua-ban", path: "/mua-ban",
    title: "Mua bán — Quỳnh Phụ",
    description: "Rao vặt mua bán của người dân Quỳnh Phụ — xe cộ, nhà đất, điện tử, đồ gia dụng, nông sản… Đăng tin và tìm mua dễ dàng.",
  });
}

export const dynamic = "force-dynamic";

function toItem(d: ClassifiedDoc, units: Map<string, AdminUnit>, showPhone = false): ClassifiedItem {
  const u = units.get(d.location.wardSlug);
  return {
    slug: d.slug, title: d.title, category: d.category, categoryLabel: d.categoryLabel,
    images: d.images ?? [],
    excerpt: stripHtml(d.description).slice(0, 120),
    priceText: d.priceText, condition: d.condition ?? null,
    ward: u?.name ?? d.location.wardSlug, wardSlug: d.location.wardSlug, newCommune: u?.newCommune ?? null,
    status: d.status, featured: d.featured, views: d.views, createdAt: d.createdAt.toISOString(),
    phone: showPhone || !d.contact.hidePhone ? d.contact.phone : null,
  };
}

export default async function MuaBanPage() {
  const [docs, session, total, units, settings, dbCats, dbConds] = await Promise.all([listClassifieds({ limit: 500 }), getSession(), countClassifieds(), getAdminUnitsMap(), getSettings(), listActiveCategoryOptions("mua-ban"), listActiveCategoryOptions("tinh-trang")]);
  const items = docs.map((d) => toItem(d, units));
  const pendingItems: ClassifiedItem[] = session
    ? (await listMyClassifieds(session.id)).filter((d) => !d.approved && d.active).map((d) => toItem(d, units, true))
    : [];

  // Danh mục lấy 100% từ DB (admin quản lý ở /admin/danh-muc).
  const categories = dbCats.map((c) => ({ slug: c.slug, name: c.name }));
  const conditions = dbConds.map((c) => ({ slug: c.slug, name: c.name }));
  const wards = [...new Map(items.map((i) => [i.wardSlug, { slug: i.wardSlug, name: i.ward, newCommune: i.newCommune ?? undefined }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <>
      <JsonLd data={[jsonLdBreadcrumb([{ name: "Trang chủ", path: "/" }, { name: "Mua bán", path: "/mua-ban" }])]} />
      <section className="qp-pagehero" aria-labelledby="mb-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Mua bán</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Tiện ích cộng đồng</span>
          <h1 id="mb-title" className="type-h1">Mua bán Quỳnh Phụ</h1>
          <p className="qp-pagehero__lead">
            Chợ rao vặt của người dân — đăng tin bán xe cộ, nhà đất, điện tử, đồ gia dụng, nông sản…
            và tìm mua đồ trong huyện. Tin đăng được duyệt trước khi hiển thị.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-kpi-strip">
        <div className="container-wide">
          <div className="qp-kpi-grid">
            <Kpi value={total} unit="tin" label="Tin đang rao" />
            <Kpi value={categories.length} unit="danh mục" label="Ngành hàng" />
            <Kpi value={wards.length} unit="xã/TT" label="Phủ khắp xã" />
          </div>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <ClassifiedBrowser items={items} pendingItems={pendingItems} categories={categories} conditions={conditions} wards={wards} isLoggedIn={!!session} defaultName={session?.name ?? ""} maxImages={settings.postMaxImages} />
        </div>
      </section>
    </>
  );
}

function Kpi({ value, unit, label }: { value: number; unit: string; label: string }) {
  return (
    <div className="qp-kpi">
      <div className="qp-kpi__value"><span className="num">{value}</span><span className="unit">{unit}</span></div>
      <div className="qp-kpi__label">{label}</div>
    </div>
  );
}
