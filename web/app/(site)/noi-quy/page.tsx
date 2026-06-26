import { pageMetadata } from "@/lib/page-seo";
import Link from "next/link";
import {
  RULES_TITLE, RULES_INTRO, RULES_ITEMS, RULES_NOTE, RULES_OUTRO, RULES_SIGNATURE,
} from "@/lib/rules";

export async function generateMetadata() {
  return pageMetadata({
    key: "/noi-quy", path: "/noi-quy",
    title: "Nội quy & Quy định đăng bài — Quỳnh Phụ Tôi",
    description:
      "Quy định đăng bài và nội quy cộng đồng trên Trang cộng đồng Quỳnh Phụ: những nội dung không được phê duyệt nhằm bảo đảm an toàn, chất lượng và quyền riêng tư của thành viên.",
  });
}

export default function NoiQuyPage() {
  return (
    <>
      <section className="qp-pagehero" aria-labelledby="nq-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Nội quy</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Cộng đồng</span>
          <h1 id="nq-title" className="type-h1">{RULES_TITLE}</h1>
          <p className="qp-pagehero__lead">
            Cùng nhau giữ gìn một cộng đồng văn minh, an toàn và hữu ích cho bà con Quỳnh Phụ.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-rules">
        <div className="container-wide">
          <div className="qp-rules__lead">
            <span className="qp-rules__lead-icon" aria-hidden>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="m5.6 5.6 12.8 12.8" />
              </svg>
            </span>
            <p>{RULES_INTRO}</p>
          </div>

          <div className="qp-rules__head">
            <h2>Nội dung không được phê duyệt</h2>
            <span className="qp-rules__count">{RULES_ITEMS.length} quy định</span>
          </div>

          <ol className="qp-rules-grid">
            {RULES_ITEMS.map((item, i) => (
              <li key={i} className="qp-rule-card">
                <span className="qp-rule-card__no" aria-hidden>{i + 1}</span>
                <p className="qp-rule-card__text">{item}</p>
              </li>
            ))}
          </ol>

          <div className="qp-alert is-info qp-rules__note" role="note">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none" }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>{RULES_NOTE}</span>
          </div>

          <div className="qp-rules__outro">
            <p>{RULES_OUTRO}</p>
            <div className="qp-rules__sign">
              <span className="qp-rules__sign-line" aria-hidden />
              <b>{RULES_SIGNATURE.replace(/^Ban Quản trị\s*—\s*/, "")}</b>
              <small>Ban Quản trị Trang cộng đồng Quỳnh Phụ</small>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
