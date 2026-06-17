"use client";

// Bộ duyệt việc làm — lọc theo ngành / loại hình / xã + tìm kiếm; lưới thẻ tin.
import { useMemo, useState } from "react";
import Link from "next/link";
import { FilterBar } from "@/components/common/FilterBar";
import { ListPager } from "@/components/common/ListPager";
import { usePagedList } from "@/lib/use-paged-list";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/lostfound/Combobox";
import { CardMedia } from "@/components/common/CardMedia";
import { JobPostModal } from "./JobPostModal";
import { formatDate } from "@/lib/datetime";

export type JobItem = {
  slug: string;
  title: string;
  company: string;
  industry: string;          // slug ngành
  industryLabel: string;
  jobType: string;           // slug loại hình
  jobTypeLabel: string;
  images: string[];
  salaryText: string;
  ageText: string;            // hiển thị: "18 - 35 tuổi" / "" nếu không yêu cầu
  ageMin: number | null;      // dùng để lọc theo tuổi
  ageMax: number | null;
  ward: string;
  wardSlug: string;
  newCommune: string | null;
  quantity: number | null;
  deadline: string | null;   // ISO
  status: "open" | "closed" | "filled";
  featured: boolean;
  views: number;
  createdAt: string;         // ISO
  phone: string | null;
};

const PAGE_SIZE = 9;

function BriefcaseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
}
function Pin() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>; }
function Wallet() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></svg>; }
function Clock() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }
function Eye() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>; }
function User() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>; }

function JobCard({ j, pending = false }: { j: JobItem; pending?: boolean }) {
  const href = `/viec-lam/${j.slug}`;
  return (
    <article className={`qp-newscard${pending ? " is-pending" : ""}`}>
      <Link href={href} className={`qp-newscard__media${j.images.length ? "" : " qp-newscard__media--icon"}`} aria-label={j.title}>
        <CardMedia images={j.images} fallback={<BriefcaseIcon />} alt={j.title} />
        <span className="qp-newscard__badge">{j.jobTypeLabel}</span>
      </Link>
      <div className="qp-newscard__body">
        <div className="qp-lf-card__top">
          <span className="qp-tag-cat">{j.industryLabel}</span>
          {pending ? <span className="qp-lf-status is-pending">⏳ Chờ duyệt</span>
            : j.status === "closed" ? <span className="qp-lf-status">Đã đóng</span>
            : j.featured ? <span className="qp-badge-g4">NỔI BẬT</span> : null}
        </div>
        <h3 className="qp-newscard__title"><Link href={href}>{j.title}</Link></h3>
        <div className="qp-job-card__salary"><Wallet /> {j.salaryText}</div>
        {j.ageText && <div className="qp-job-card__salary"><User /> {j.ageText}</div>}
        <div className="qp-newscard__meta qp-lf-meta">
          <div className="qp-lf-meta__loc">
            <Pin /> <span>{j.ward}{j.newCommune ? <span className="qp-newscard__nc"> ({j.newCommune})</span> : null}</span>
          </div>
          <div className="qp-lf-meta__sub">
            {j.deadline && <span className="qp-lf-meta__item"><Clock /> Hạn {formatDate(j.deadline)}</span>}
            <span className="qp-lf-meta__item"><Eye /> {j.views} lượt xem</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function JobBrowser({
  items, pendingItems, industries, jobTypes, wards, isLoggedIn, defaultName, maxImages,
}: {
  items: JobItem[];
  pendingItems: JobItem[];
  industries: { slug: string; name: string }[];
  jobTypes: { slug: string; name: string }[];
  wards: { slug: string; name: string; newCommune?: string }[];
  isLoggedIn: boolean;
  defaultName: string;
  maxImages: number;
}) {
  const [view, setView] = useState<"all" | "cho-duyet">("all");
  const [industry, setIndustry] = useState("all");
  const [jobType, setJobType] = useState("all");
  const [ward, setWard] = useState("all");
  const [age, setAge] = useState("");   // "tuổi của bạn" — lọc tin phù hợp độ tuổi
  const [query, setQuery] = useState("");
  const [postOpen, setPostOpen] = useState(false);
  const router = useRouter();
  const isPending = view === "cho-duyet";

  const indOptions = useMemo(() => [{ value: "all", label: `Tất cả ngành (${industries.length})` }, ...industries.map((i) => ({ value: i.slug, label: i.name }))], [industries]);
  const typeOptions = useMemo(() => [{ value: "all", label: "Tất cả loại hình" }, ...jobTypes.map((t) => ({ value: t.slug, label: t.name }))], [jobTypes]);
  const wardOptions = useMemo(() => [{ value: "all", label: `Tất cả xã/thị trấn (${wards.length})` }, ...wards.map((w) => ({ value: w.slug, label: w.name, hint: w.newCommune ? `Xã mới: ${w.newCommune}` : undefined }))], [wards]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ageNum = age.trim() ? Number(age) : null;
    const src = isPending ? pendingItems : items;
    return src.filter((j) => {
      const okInd = industry === "all" || j.industry === industry;
      const okType = jobType === "all" || j.jobType === jobType;
      const okWard = ward === "all" || j.wardSlug === ward;
      // Lọc theo tuổi: tin phù hợp nếu tuổi của bạn nằm trong khoảng yêu cầu (hoặc tin không yêu cầu tuổi).
      const okAge = ageNum === null || Number.isNaN(ageNum)
        || ((j.ageMin === null || ageNum >= j.ageMin) && (j.ageMax === null || ageNum <= j.ageMax));
      const okQ = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.ward.toLowerCase().includes(q);
      return okInd && okType && okWard && okAge && okQ;
    });
  }, [items, pendingItems, isPending, industry, jobType, ward, age, query]);

  const pager = usePagedList(filtered, PAGE_SIZE);
  const pageItems = pager.items;
  const reset = pager.reset;

  return (
    <>
      <div className="qp-lf-head">
        <div className="qp-tabs" role="tablist" aria-label="Lọc tin">
          <button type="button" role="tab" aria-selected={view === "all"} className={`qp-tab${view === "all" ? " is-active" : ""}`} onClick={() => { setView("all"); reset(); }}>
            Tất cả tin <span className="qp-tab__count">{items.length}</span>
          </button>
          {isLoggedIn && (
            <button type="button" role="tab" aria-selected={isPending} className={`qp-tab qp-tab--pending${isPending ? " is-active" : ""}`} onClick={() => { setView("cho-duyet"); reset(); }}>
              ⏳ Chờ duyệt <span className="qp-tab__count">{pendingItems.length}</span>
            </button>
          )}
        </div>
        <button type="button" className="qp-btn-primary qp-lf-post-btn" aria-label="Đăng tin tuyển dụng" onClick={() => setPostOpen(true)}>
          <span className="qp-postbtn-full" aria-hidden>+ Đăng tin tuyển dụng</span>
          <span className="qp-postbtn-short" aria-hidden>+ Đăng</span>
        </button>
      </div>

      <FilterBar
        className="qp-school-toolbar qp-lf-toolbar qp-job-toolbar"
        activeCount={(industry !== "all" ? 1 : 0) + (jobType !== "all" ? 1 : 0) + (ward !== "all" ? 1 : 0) + (age.trim() ? 1 : 0)}
        searchInput={
          <input type="search" placeholder="Tìm vị trí, công ty…" aria-label="Tìm việc" value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} />
        }
      >
        <div className="qp-toolbar__field"><span className="qp-toolbar__label">Ngành nghề</span><Combobox options={indOptions} value={industry} onChange={(v) => { setIndustry(v); reset(); }} placeholder="Tất cả ngành" searchPlaceholder="Tìm ngành…" /></div>
        <div className="qp-toolbar__field"><span className="qp-toolbar__label">Loại hình</span><Combobox options={typeOptions} value={jobType} onChange={(v) => { setJobType(v); reset(); }} placeholder="Tất cả loại hình" searchPlaceholder="Tìm…" /></div>
        <div className="qp-toolbar__field"><span className="qp-toolbar__label">Xã / Thị trấn</span><Combobox options={wardOptions} value={ward} onChange={(v) => { setWard(v); reset(); }} placeholder="Tất cả xã/thị trấn" searchPlaceholder="Tìm xã…" /></div>
        <div className="qp-toolbar__field qp-toolbar__field--age">
          <span className="qp-toolbar__label">Tuổi của bạn</span>
          <div className={`qp-agefield${age.trim() ? " is-filled" : ""}`}>
            <span className="qp-agefield__icon"><User /></span>
            <input
              type="number" inputMode="numeric" min={0} max={100}
              className="qp-agefield__input" value={age}
              onChange={(e) => { setAge(e.target.value); reset(); }}
              placeholder="VD: 25" aria-label="Lọc theo tuổi của bạn"
            />
            <span className="qp-agefield__suffix">tuổi</span>
            {age.trim() !== "" && (
              <button type="button" className="qp-agefield__clear" aria-label="Bỏ lọc tuổi" onClick={() => { setAge(""); reset(); }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 4l8 8M12 4l-8 8" /></svg>
              </button>
            )}
          </div>
        </div>
      </FilterBar>
      {age.trim() !== "" && !Number.isNaN(Number(age)) && (
        <p className="qp-job-agehint">Đang hiển thị việc phù hợp với <b>{Number(age)} tuổi</b> — gồm cả tin không yêu cầu độ tuổi.</p>
      )}

      <div className="qp-newsgrid-head qp-newsgrid-head--count">
        <span className="type-tag qp-sechead__eyebrow">{isPending ? "Tin của bạn" : "Tin tuyển dụng"}</span>
        <h2 className="type-h2">{filtered.length} tin{isPending ? " chờ duyệt" : ""}</h2>
      </div>

      {isPending && <p className="qp-lf-pending-note">Đây là các tin bạn vừa đăng, đang chờ duyệt. Sau khi được duyệt sẽ hiển thị công khai.</p>}

      {pageItems.length === 0 ? (
        <div className="qp-empty">
          <div className="qp-empty__title">{isPending ? "Bạn chưa có tin chờ duyệt" : "Chưa có tin phù hợp"}</div>
          <p className="type-body-small">{isPending ? "Bấm “+ Đăng tin tuyển dụng” để gửi tin." : "Thử đổi ngành, loại hình, xã hoặc từ khoá."}</p>
        </div>
      ) : (
        <div className="qp-grid-news">{pageItems.map((j) => <JobCard key={j.slug} j={j} pending={isPending} />)}</div>
      )}

      <ListPager pager={pager} />

      {postOpen && <JobPostModal open onClose={() => setPostOpen(false)} isLoggedIn={isLoggedIn} defaultName={defaultName} maxImages={maxImages} industries={industries} jobTypes={jobTypes} onSuccess={() => router.refresh()} />}
    </>
  );
}
