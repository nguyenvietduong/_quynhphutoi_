import { pageMetadata } from "@/lib/page-seo";
import Link from "next/link";
import { listJobs, listMyJobs, countJobs, formatSalary, type JobDoc } from "@/lib/jobs";
import { getSession } from "@/lib/auth";
import { INDUSTRIES } from "@/lib/industries";
import { WARDS } from "@/lib/wards";
import { getAdminUnitsMap, type AdminUnit } from "@/lib/admin-units";
import { JobBrowser, type JobItem } from "@/components/jobs/JobBrowser";
import { getSettings } from "@/lib/settings";

export async function generateMetadata() {
  return pageMetadata({
    key: "/viec-lam", path: "/viec-lam",
    title: "Việc làm Quỳnh Phụ",
    description: "Tin tuyển dụng, việc làm tại xã Quỳnh Phụ — toàn thời gian, bán thời gian, thời vụ. Lọc theo ngành nghề và xã/thị trấn.",
  });
}

export const dynamic = "force-dynamic";

function toJobItem(d: JobDoc, units: Map<string, AdminUnit>, showPhone = false): JobItem {
  const u = units.get(d.location.wardSlug);
  return {
    slug: d.slug,
    title: d.title,
    company: d.company,
    industry: d.industry,
    industryLabel: d.industryLabel,
    jobTypeLabel: d.jobTypeLabel,
    images: d.images ?? [],
    salaryText: formatSalary(d.salary),
    ward: u?.name ?? d.location.wardSlug,
    wardSlug: d.location.wardSlug,
    newCommune: u?.newCommune ?? null,
    quantity: d.quantity ?? null,
    deadline: d.deadline ? d.deadline.toISOString() : null,
    status: d.status,
    featured: d.featured,
    views: d.views,
    createdAt: d.createdAt.toISOString(),
    phone: showPhone || !d.contact.hidePhone ? d.contact.phone : null,
  };
}

export default async function ViecLamPage() {
  const [docs, session, total, units, settings] = await Promise.all([listJobs({ limit: 500 }), getSession(), countJobs(), getAdminUnitsMap(), getSettings()]);
  const items = docs.map((d) => toJobItem(d, units));
  const pendingItems: JobItem[] = session
    ? (await listMyJobs(session.id)).filter((d) => !d.approved && d.active).map((d) => toJobItem(d, units, true))
    : [];

  const industries = INDUSTRIES.map((i) => ({ slug: i.slug, name: i.name }));
  const wards = WARDS.map((w) => ({ slug: w.slug, name: w.name, newCommune: w.newCommune }));
  const featuredCount = items.filter((i) => i.featured).length;

  return (
    <>
      <section className="qp-pagehero" aria-labelledby="vl-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Việc làm</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Tiện ích cộng đồng</span>
          <h1 id="vl-title" className="type-h1">Việc làm Quỳnh Phụ</h1>
          <p className="qp-pagehero__lead">
            Tin tuyển dụng và việc làm trên địa bàn huyện — từ công nhân, nông nghiệp, dịch vụ đến
            văn phòng. Lọc theo ngành nghề, loại hình và xã, thị trấn.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-kpi-strip">
        <div className="container-wide">
          <div className="qp-kpi-grid">
            <Kpi value={total} unit="tin" label="Tổng tin tuyển dụng" />
            <Kpi value={featuredCount} unit="tin" label="Tin nổi bật" />
            <Kpi value={industries.length} unit="ngành" label="Ngành nghề" />
          </div>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <JobBrowser items={items} pendingItems={pendingItems} industries={industries} wards={wards} isLoggedIn={!!session} defaultName={session?.name ?? ""} maxImages={settings.postMaxImages} />
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
