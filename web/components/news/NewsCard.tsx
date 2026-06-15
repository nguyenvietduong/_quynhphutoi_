import Link from "next/link";
import Image from "next/image";
import { fmtViews, type Article } from "@/lib/news";

/* Card bài viết dùng chung (trang Tin tức + section tin tức trang chủ).
   Badge đè trên ảnh, title 2 dòng (giữ chiều cao), excerpt, meta chấm. */
export function NewsCard({ a }: { a: Article }) {
  const href = `/tin-tuc/${a.slug}`;
  return (
    <article className="qp-newscard">
      <Link href={href} className="qp-newscard__media" aria-label={a.title}>
        <Image src={a.image} alt="" fill sizes="(max-width:767px) 100vw, (max-width:1023px) 50vw, 25vw" style={{ objectFit: "cover" }} />
        <span className="qp-newscard__badge">{a.category}</span>
      </Link>
      <div className="qp-newscard__body">
        <h3 className="qp-newscard__title"><Link href={href}>{a.title}</Link></h3>
        <p className="qp-newscard__excerpt">{a.excerpt}</p>
        <div className="qp-newscard__meta">
          <span>{a.date}</span>
          <span className="qp-dot-sep" aria-hidden />
          <span>{a.readTime}</span>
          <span className="qp-dot-sep" aria-hidden />
          <span>{fmtViews(a.views)}</span>
        </div>
      </div>
    </article>
  );
}
