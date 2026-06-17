import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";
import { NotifList, type NotifItem } from "@/components/account/NotifList";

export const metadata: Metadata = { title: "Thông báo — Quỳnh Phụ Tôi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ThongBaoPage() {
  const session = await getSession();
  if (!session) redirect("/dang-nhap?next=/thong-bao");

  const docs = await listNotifications(session.id, { limit: 100 });
  const items: NotifItem[] = docs.map((n) => ({
    id: n._id!.toString(),
    type: n.type,
    title: n.title,
    href: n.href,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <>
      <section className="qp-pagehero" aria-labelledby="tb-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Thông báo</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Tài khoản</span>
          <h1 id="tb-title" className="type-h1">Thông báo của bạn</h1>
          <p className="qp-pagehero__lead">Cập nhật về tin đăng được duyệt, bình luận và lượt thích liên quan tới bạn.</p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide" style={{ maxWidth: 860 }}>
          <NotifList initial={items} />
        </div>
      </section>
    </>
  );
}
