import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobBySlug, incrementViews, relatedJobs, formatSalary, formatAge } from "@/lib/jobs";
import { getCurrentUser } from "@/lib/admin";
import { isStaff } from "@/lib/users";
import { stripHtml } from "@/lib/strip-html";
import { cldHtml } from "@/lib/cloudinary-url";
import { getAdminUnitsMap } from "@/lib/admin-units";
import { JobActions } from "@/components/jobs/JobActions";
import { ImageGallery } from "@/components/common/ImageGallery";
import { DetailSocial } from "@/components/common/DetailSocial";
import { MapEmbed } from "@/components/common/MapEmbed";
import { formatDate } from "@/lib/datetime";
import { buildMetadata, jsonLdJob, jsonLdBreadcrumb } from "@/lib/seo";
import { applySeo } from "@/lib/seo-fields";
import { JsonLd } from "@/components/common/JsonLd";
import { AffiliateCTA } from "@/components/common/AffiliateCTA";

export const dynamic = "force-dynamic";

const STATUS = { open: "Đang tuyển", closed: "Đã đóng", filled: "Đã tuyển đủ" } as const;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(-2).join("").toUpperCase() || "?";
}
// Ẩn bớt SĐT: chỉ hiện 3 số đầu, phần còn lại thay bằng dấu *.
function maskPhone(p: string) {
  const d = p.replace(/\s+/g, "");
  return d.length <= 3 ? d : d.slice(0, 3) + "*".repeat(d.length - 3);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return { title: "Không tìm thấy tin" };
  return buildMetadata({
    ...applySeo({
      title: `${job.title} — ${job.company}`,
      description: stripHtml(job.description).slice(0, 160),
      image: job.images?.[0],
    }, job.seo),
    path: `/viec-lam/${slug}`,
    type: "article",
    publishedTime: job.createdAt?.toISOString(),
    modifiedTime: job.updatedAt?.toISOString(),
    noindex: !job.approved || job.seo?.noindex,   // chưa duyệt → luôn ẩn; admin có thể ẩn thêm
  });
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job || !job.active) notFound();

  const user = await getCurrentUser();
  const isOwner = !!user && user._id?.toString() === job.postedBy.toString();
  if (!job.approved && !isOwner && !isStaff(user)) notFound();
  if (job.approved && !isOwner) await incrementViews(slug);

  const showPhone = !job.contact.hidePhone || isOwner;
  const [related, units] = await Promise.all([
    job.approved ? relatedJobs(slug, 3) : Promise.resolve([]),
    getAdminUnitsMap(),
  ]);
  const unit = units.get(job.location.wardSlug);
  const wardName = unit?.name ?? job.location.wardSlug;
  const lead = stripHtml(job.description).slice(0, 200);
  const newCommune = unit?.newCommune;

  return (
    <article>
      {job.approved && (
        <JsonLd data={[
          jsonLdJob(job, lead, wardName),
          jsonLdBreadcrumb([
            { name: "Trang chủ", path: "/" },
            { name: "Việc làm", path: "/viec-lam" },
            { name: job.title, path: `/viec-lam/${slug}` },
          ]),
        ]} />
      )}
      <section className="qp-pagehero qp-lf-hero is-nhat-duoc" aria-labelledby="jb-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-lf-hero__art" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
        </span>
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <Link href="/viec-lam">Việc làm</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">{job.title}</span>
          </nav>
          <div className="qp-lf-detail__badges">
            <span className="qp-tag-cat">{job.industryLabel}</span>
            <span className="qp-job-type">{job.jobTypeLabel}</span>
            {job.status !== "open" && <span className="qp-lf-status">{STATUS[job.status]}</span>}
            {job.featured && <span className="qp-badge-g4">NỔI BẬT</span>}
            {!job.approved && <span className="qp-lf-status is-pending">⏳ Chờ duyệt</span>}
          </div>
          <h1 id="jb-title" className="type-h1" style={{ margin: "var(--space-3) 0 var(--space-2)" }}>{job.title}</h1>
          <div className="qp-job-detail__company">{job.company}</div>
          {lead && <p className="qp-pagehero__lead" style={{ marginTop: "var(--space-3)" }}>{lead}</p>}
          <div className="qp-author">
            <span className="qp-avatar-initials" aria-hidden>{initials(job.postedByName)}</span>
            <div>
              <div className="qp-author__name">{job.postedByName}</div>
              <div className="qp-author__meta">Đăng ngày {formatDate(job.createdAt)} · {job.views} lượt xem</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-wide qp-lf-body">
        {!job.approved && (
          <div className="qp-alert is-warning" role="status" style={{ maxWidth: 820, marginBottom: "var(--space-6)" }}>
            <div className="qp-alert__body"><strong>Tin đang chờ duyệt.</strong> Chỉ bạn và quản trị viên xem được.</div>
          </div>
        )}

        <div className="qp-article-layout is-lf">
          <div className="qp-lf-main">
            <ImageGallery images={job.images ?? []} alt={job.title} />
            <div className="rich-text-editor__content qp-rte-view" dangerouslySetInnerHTML={{ __html: cldHtml(job.description) }} />
            {job.location.mapUrl && (
              <div style={{ marginTop: "var(--space-6)" }}>
                <MapEmbed url={job.location.mapUrl} address={job.location.address} />
              </div>
            )}
            <JobActions slug={job.slug} title={job.title} isOwner={isOwner} status={job.status} />
            <AffiliateCTA />
            <DetailSocial type="viec-lam" slug={slug} title={job.title} />
          </div>

          <aside className="qp-lf-aside">
            <div className="qp-lf-infocard qp-lf-infocard--cta">
              <div className="qp-job-detail__salary"><span>Mức lương</span><b>{formatSalary(job.salary)}</b></div>
              <div className="qp-lf-infocard__title" style={{ marginTop: 14 }}>Liên hệ ứng tuyển</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Người liên hệ</span><b>{job.contact.name}</b></div>
                <div className="qp-lf-spec__row"><span>Điện thoại</span>{!showPhone ? <b><i style={{ fontWeight: 400 }}>Đã ẩn</i></b> : isOwner ? <b><a href={`tel:${job.contact.phone}`}>{job.contact.phone}</a></b> : <b>{maskPhone(job.contact.phone)}</b>}</div>
                {job.contact.email && showPhone && <div className="qp-lf-spec__row"><span>Email</span><b><a href={`mailto:${job.contact.email}`}>{job.contact.email}</a></b></div>}
              </div>
              {showPhone && !isOwner && job.status === "open" && <a href={`tel:${job.contact.phone}`} className="qp-btn-primary qp-btn-block mt-6">Gọi ứng tuyển ngay</a>}
              {isOwner && <p className="type-body-small text-muted" style={{ margin: "12px 0 0" }}>Đây là thông tin hiển thị cho ứng viên.</p>}
            </div>

            <div className="qp-lf-infocard">
              <div className="qp-lf-infocard__title">Thông tin tuyển dụng</div>
              <div className="qp-lf-spec">
                <div className="qp-lf-spec__row"><span>Ngành nghề</span><b>{job.industryLabel}</b></div>
                <div className="qp-lf-spec__row"><span>Loại hình</span><b>{job.jobTypeLabel}</b></div>
                <div className="qp-lf-spec__row"><span>Địa điểm</span><b>{wardName}{newCommune && <><br /><span className="qp-lf-spec__sub">(Xã mới: {newCommune})</span></>}{job.location.address && <><br /><span className="qp-lf-spec__sub" style={{ color: "var(--color-gray-text)" }}>{job.location.address}</span></>}</b></div>
                {job.quantity ? <div className="qp-lf-spec__row"><span>Số lượng</span><b>{job.quantity} người</b></div> : null}
                {formatAge(job.age) && <div className="qp-lf-spec__row"><span>Độ tuổi</span><b>{formatAge(job.age)}</b></div>}
                {job.experience && <div className="qp-lf-spec__row"><span>Kinh nghiệm</span><b>{job.experience}</b></div>}
                {job.education && <div className="qp-lf-spec__row"><span>Trình độ</span><b>{job.education}</b></div>}
                {job.deadline && <div className="qp-lf-spec__row"><span>Hạn nộp</span><b>{formatDate(job.deadline)}</b></div>}
                <div className="qp-lf-spec__row"><span>Trạng thái</span><b>{STATUS[job.status]}</b></div>
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="qp-lf-related">
            <header className="qp-newsgrid-head">
              <span className="type-tag qp-sechead__eyebrow">Cùng ngành</span>
              <h2 className="type-h2">Tin liên quan</h2>
            </header>
            <div className="qp-job-grid">
              {related.map((r) => (
                <article className="qp-job-card" key={r.slug}>
                  <div className="qp-job-card__head">
                    <span className="qp-job-card__logo" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    </span>
                    <div className="qp-job-card__head-main">
                      <Link href={`/viec-lam/${r.slug}`} className="qp-job-card__title">{r.title}</Link>
                      <div className="qp-job-card__company">{r.company}</div>
                    </div>
                  </div>
                  <div className="qp-job-card__salary"><span>{formatSalary(r.salary)}</span></div>
                  <div className="qp-job-card__meta"><span>📍 {units.get(r.location.wardSlug)?.name ?? r.location.wardSlug}</span></div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
