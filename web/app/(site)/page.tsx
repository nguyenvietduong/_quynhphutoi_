import type { Metadata } from "next";
import Link from "next/link";
import { HeroSlider } from "@/components/home/HeroSlider";
import { listArticles, toNewsCardArticle } from "@/lib/articles";
import { NewsCard } from "@/components/news/NewsCard";
import { SITE, buildMetadata, jsonLdWebSite, jsonLdOrganization } from "@/lib/seo";
import { JsonLd } from "@/components/common/JsonLd";

export const metadata: Metadata = {
  ...buildMetadata({ title: SITE.name, description: SITE.description, path: "/" }),
  title: { absolute: `${SITE.name} — Tin tức, việc làm & cộng đồng Quỳnh Phụ, Thái Bình` },
};

/* ----------------------------- Dữ liệu mẫu ----------------------------- */
const KPIS = [
  { num: "230.000", unit: "+", label: "Dân số toàn huyện" },
  { num: "37", unit: "", label: "Xã & thị trấn" },
  { num: "120", unit: "+", label: "Trường học các cấp" },
  { num: "1.000", unit: "+", label: "Tin việc làm" },
];

const TILES = [
  { href: "/truong-hoc", title: "Trường học", desc: "Danh bạ trường mầm non đến THPT theo xã.", icon: "school" },
  { href: "/y-te", title: "Y tế", desc: "Bệnh viện, trạm y tế, phòng khám & SĐT.", icon: "health" },
  { href: "/viec-lam", title: "Việc làm", desc: "Tin tuyển dụng địa phương, lọc theo ngành.", icon: "job" },
  { href: "/tim-do-roi", title: "Tìm đồ rơi", desc: "Đăng & tra tin nhặt được / bị mất đồ.", icon: "search" },
  { href: "/cho-mua-ban", title: "Chợ & Mua bán", desc: "Lịch chợ phiên, đặc sản, tin mua bán.", icon: "market" },
  { href: "/di-tich", title: "Di tích", desc: "Đình, chùa, đền và di tích lịch sử.", icon: "landmark" },
];


const JOBS = [
  { title: "Công nhân may (200 vị trí)", company: "Công ty May Quỳnh Côi", nganh: "May mặc", location: "TT Quỳnh Côi", salary: "7–9 triệu", posted: "Hôm nay", isNew: true },
  { title: "Nhân viên kho – vận hành", company: "CCN An Bài", nganh: "Sản xuất", location: "Xã An Bài", salary: "8–10 triệu", posted: "Hôm qua", isNew: true },
  { title: "Kế toán bán hàng", company: "Cửa hàng VLXD Đông Hải", nganh: "Văn phòng", location: "Xã Đông Hải", salary: "Thoả thuận", posted: "2 ngày trước", isNew: false },
];

const LOSTFOUND = [
  { status: "found", title: "Nhặt được ví da màu nâu", area: "Chợ Đọ", date: "10/06", icon: "search" },
  { status: "lost", title: "Mất giấy tờ xe máy mang tên N.V.A", area: "Xã Quỳnh Hải", date: "09/06", icon: "alert" },
  { status: "found", title: "Nhặt được chìa khoá xe + thẻ ATM", area: "TT An Bài", date: "08/06", icon: "search" },
  { status: "lost", title: "Thất lạc chó cảnh màu vàng", area: "Xã Quỳnh Hồng", date: "07/06", icon: "alert" },
];

const EVENTS = [
  { day: "12", month: "06", title: "Phiên chợ Quỳnh Côi", place: "TT Quỳnh Côi", time: "Cả ngày", type: "Chợ phiên" },
  { day: "15", month: "06", title: "Khám sức khoẻ miễn phí cho người cao tuổi", place: "TYT xã An Bài", time: "07:30 – 11:00", type: "Y tế" },
  { day: "20", month: "06", title: "Ngày hội việc làm huyện Quỳnh Phụ", place: "Trung tâm VH huyện", time: "08:00 – 16:00", type: "Việc làm" },
];

const SERVICES = [
  {
    tone: "is-school", icon: "school", cat: "Giáo dục", title: "Trường học", href: "/truong-hoc", linkLabel: "Xem danh bạ",
    desc: "Danh bạ trường mầm non đến THPT theo từng xã, kèm địa chỉ và thông tin tuyển sinh.",
    stats: [{ num: "120+", label: "Trường" }, { num: "37", label: "Xã/TT" }],
    tags: ["Mầm non", "Tiểu học", "THCS", "THPT"],
  },
  {
    tone: "is-health", icon: "health", cat: "Sức khoẻ", title: "Y tế", href: "/y-te", linkLabel: "Xem cơ sở",
    desc: "Bệnh viện, trạm y tế và phòng khám trên địa bàn, kèm số điện thoại và giờ làm việc.",
    stats: [{ num: "15", label: "Cơ sở" }, { num: "115", label: "Cấp cứu" }],
    tags: ["Bệnh viện", "Trạm y tế", "Phòng khám"],
  },
  {
    tone: "is-transit", icon: "bus", cat: "Đi lại", title: "Giao thông", href: "/giao-thong", linkLabel: "Xem tuyến",
    desc: "Tuyến xe buýt, xe khách và lộ trình kết nối Quỳnh Phụ với các huyện, tỉnh lân cận.",
    stats: [{ num: "8", label: "Tuyến" }, { num: "5", label: "Bến xe" }],
    tags: ["Xe buýt", "Xe khách", "Lộ trình"],
  },
];

const HOTLINES = [
  { label: "Cấp cứu y tế", value: "115", icon: "ambulance" },
  { label: "Công an huyện", value: "113", icon: "shield" },
  { label: "Đường dây phản ánh", value: "0227 386 xxxx", icon: "megaphone" },
];

/* ------------------------------- Icons -------------------------------- */
function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const p = {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const, width: size, height: size,
  };
  switch (name) {
    case "school": return (<svg {...p}><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2.7 2 6 2s6-1 6-2v-5" /></svg>);
    case "health": return (<svg {...p}><path d="M3 12h4l2 5 4-10 2 5h4" /></svg>);
    case "job": return (<svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
    case "search": return (<svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>);
    case "market": return (<svg {...p}><path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z" /><path d="M4 6h16M9 10a3 3 0 0 0 6 0" /></svg>);
    case "landmark": return (<svg {...p}><path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M12 3 4 8h16z" /></svg>);
    case "bus": return (<svg {...p}><rect x="4" y="4" width="16" height="13" rx="2" /><path d="M4 11h16M8 17v2M16 17v2" /><circle cx="8.5" cy="14" r="1" /><circle cx="15.5" cy="14" r="1" /></svg>);
    case "map-pin": return (<svg {...p}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>);
    case "clock": return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
    case "alert": return (<svg {...p}><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>);
    case "ambulance": return (<svg {...p}><path d="M10 10H6M8 8v4" /><path d="M3 17V7a1 1 0 0 1 1-1h11v11" /><path d="M15 9h4l2 3v5h-6" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" /></svg>);
    case "shield": return (<svg {...p}><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>);
    case "megaphone": return (<svg {...p}><path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1z" /><path d="M18 9a3 3 0 0 1 0 6" /></svg>);
    default: return null;
  }
}

function SectionHead({ eyebrow, title, href, linkLabel = "Xem tất cả", desc }: { eyebrow: string; title: string; href?: string; linkLabel?: string; desc?: string }) {
  return (
    <header className="qp-sechead">
      <div className="qp-sechead__titles">
        <span className="type-tag qp-sechead__eyebrow">{eyebrow}</span>
        <h2 className="type-h2">{title}</h2>
        {desc && <p className="qp-sechead__desc">{desc}</p>}
      </div>
      {href && (
        <Link className="qp-sechead__link" href={href}>
          {linkLabel} <span aria-hidden>→</span>
        </Link>
      )}
    </header>
  );
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 4 bài viết mới nhất đã xuất bản (DB) cho section tin tức trang chủ.
  const latestNews = (await listArticles({ status: "published", limit: 4 }).catch(() => [])).map(toNewsCardArticle);
  return (
    <>
      <JsonLd data={[jsonLdWebSite(), jsonLdOrganization()]} />
      <HeroSlider />

      {/* KPI STRIP */}
      <section className="qp-kpi-strip">
        <div className="container-wide qp-kpi-grid">
          {KPIS.map((k) => (
            <div className="qp-kpi" key={k.label}>
              <div className="qp-kpi__value">
                <span className="num">{k.num}</span>
                {k.unit && <span className="unit">{k.unit}</span>}
              </div>
              <span className="qp-kpi__label">{k.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* TRUY CẬP NHANH */}
      <section className="section">
        <div className="container-wide">
          <SectionHead eyebrow="Tiện ích" title="Truy cập nhanh" desc="Các mục thông tin được người dân quan tâm nhất." />
          <div className="grid grid-3 qp-scroller">
            {TILES.map((t) => (
              <Link className="qp-tile" href={t.href} key={t.href}>
                <span className="qp-tile__icon"><Icon name={t.icon} /></span>
                <span className="qp-tile__title">{t.title}</span>
                <span className="qp-tile__desc">{t.desc}</span>
                <span className="qp-tile__link">Xem chi tiết <span aria-hidden>→</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TIN TỨC & THÔNG BÁO — chỉ hiện khi đã có bài xuất bản */}
      {latestNews.length > 0 && (
        <section className="section section-alt">
          <div className="container-wide">
            <SectionHead eyebrow="Cập nhật" title="Tin tức & thông báo" href="/tin-tuc" />

            <div className="qp-grid-news qp-scroller">
              {latestNews.map((a) => (
                <NewsCard key={a.id} a={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VIỆC LÀM MỚI NHẤT */}
      <section className="section">
        <div className="container-wide">
          <SectionHead eyebrow="Tuyển dụng" title="Việc làm mới nhất" href="/viec-lam" />
          <div className="grid grid-3 qp-scroller">
            {JOBS.map((j) => (
              <article className="qp-mesh-card qp-mesh-card--text" key={j.title}>
                <div className="qp-mesh-card__body">
                  <div className="row-between">
                    <span className="qp-category-badge">{j.nganh}</span>
                    {j.isNew && <span className="qp-badge-g4">Mới</span>}
                  </div>
                  <Link className="qp-mesh-card__title" href="/viec-lam">{j.title}</Link>
                  <p className="type-body-small text-muted">{j.company}</p>
                  <div className="qp-cardmeta">
                    <span className="qp-cardmeta__chip"><Icon name="map-pin" size={14} />{j.location}</span>
                    <span className="qp-cardmeta__chip is-salary">{j.salary}</span>
                  </div>
                  <div className="qp-card-foot">
                    <span className="type-caption text-muted">{j.posted}</span>
                    <Link className="qp-tile__link" href="/viec-lam">Ứng tuyển <span aria-hidden>→</span></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TÌM ĐỒ RƠI GẦN ĐÂY */}
      <section className="section section-alt">
        <div className="container-wide">
          <SectionHead eyebrow="Cộng đồng" title="Tìm đồ rơi gần đây" href="/tim-do-roi" />
          <div className="qp-grid-news qp-scroller">
            {LOSTFOUND.map((l) => (
              <article className="qp-newscard" key={l.title}>
                <Link href="/tim-do-roi" className="qp-newscard__media qp-newscard__media--icon" aria-label={l.title}>
                  <Icon name={l.icon} size={46} />
                  <span className={`qp-newscard__badge ${l.status === "lost" ? "is-lost" : "is-found"}`}>
                    {l.status === "lost" ? "Bị mất" : "Nhặt được"}
                  </span>
                </Link>
                <div className="qp-newscard__body">
                  <h3 className="qp-newscard__title"><Link href="/tim-do-roi">{l.title}</Link></h3>
                  <div className="qp-newscard__meta">
                    <span>{l.area}</span>
                    <span className="qp-dot-sep" aria-hidden />
                    <span>{l.date}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* LỊCH SỰ KIỆN & CHỢ PHIÊN */}
      <section className="section">
        <div className="container-wide">
          <SectionHead eyebrow="Sắp diễn ra" title="Lịch sự kiện & chợ phiên" href="/cho-mua-ban" />
          <div className="grid grid-3">
            {EVENTS.map((e) => (
              <article className="qp-event-card" key={e.title}>
                <div className="qp-event-card__date">
                  <div className="qp-event-card__day">{e.day}</div>
                  <div className="qp-event-card__month">Th{e.month}</div>
                </div>
                <div className="qp-event-card__body">
                  <span className="qp-category-badge">{e.type}</span>
                  <h3 className="qp-event-card__title">{e.title}</h3>
                  <div className="qp-event-card__meta">
                    <span><Icon name="map-pin" size={14} />{e.place}</span>
                    <span><Icon name="clock" size={14} />{e.time}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TIỆN ÍCH & DỊCH VỤ THIẾT YẾU */}
      <section className="section section-alt">
        <div className="container-wide">
          <SectionHead
            eyebrow="Dịch vụ địa phương"
            title="Tiện ích & dịch vụ thiết yếu"
            desc="Tra cứu nhanh trường học, cơ sở y tế và giao thông trên địa bàn huyện Quỳnh Phụ — kèm địa chỉ, số điện thoại và giờ làm việc."
          />
          <div className="grid grid-3">
            {SERVICES.map((s) => (
              <article className="qp-service-card" key={s.title}>
                <div className="qp-service-card__top">
                  <span className={`qp-service-card__icon ${s.tone}`}><Icon name={s.icon} size={26} /></span>
                  <div>
                    <span className="type-tag qp-service-card__cat">{s.cat}</span>
                    <div className="qp-service-card__title">{s.title}</div>
                  </div>
                </div>
                <p className="qp-service-card__desc">{s.desc}</p>
                <div className="qp-service-card__stats">
                  {s.stats.map((st) => (
                    <div className="qp-service-stat" key={st.label}>
                      <b>{st.num}</b>
                      <span>{st.label}</span>
                    </div>
                  ))}
                </div>
                <div className="qp-service-card__tags">
                  {s.tags.map((t) => <span className="qp-tag" key={t}>{t}</span>)}
                </div>
                <Link className="qp-service-card__link" href={s.href}>
                  {s.linkLabel} <span aria-hidden>→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOTLINE BAND */}
      <section className="section">
        <div className="container-wide">
          <div className="qp-cta-band">
            {HOTLINES.map((h) => (
              <div className="qp-cta-item" key={h.label}>
                <span className="qp-cta-item__icon"><Icon name={h.icon} size={24} /></span>
                <div>
                  <div className="qp-cta-item__label">{h.label}</div>
                  <div className="qp-cta-item__value">{h.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="section section-alt">
        <div className="container-wide">
          <div className="qp-newsletter">
            <h2 className="type-h2">Nhận tin huyện nhà qua email</h2>
            <p className="type-body">Tin tức, thông báo và việc làm mới — gửi gọn vào hộp thư của bạn.</p>
            <form className="qp-newsletter__form" action="#" method="post">
              <input type="email" placeholder="Email của bạn" aria-label="Email" required />
              <button className="qp-btn-secondary on-dark" type="submit">
                Đăng ký <span className="qp-arrow">→</span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
