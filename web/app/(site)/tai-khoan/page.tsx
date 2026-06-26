import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/admin";
import { isAdmin, isEditor } from "@/lib/users";
import { getMyPosts, type MyPost } from "@/lib/my-posts";
import { formatDate } from "@/lib/datetime";

export const metadata: Metadata = { title: "Trang cá nhân — Quỳnh Phụ Tôi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";


export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=/tai-khoan");

  const posts = await getMyPosts(String(user._id));
  const pending = posts.filter((p) => p.state === "pending").length;
  const bySection = (s: MyPost["section"]) => posts.filter((p) => p.section === s).length;
  const recent = posts.slice(0, 5);

  return (
    <div className="qp-acc-page">
      <header className="qp-acc-page__head">
        <h2 className="type-h2">Trang cá nhân</h2>
        <p className="type-body-small text-muted">Thông tin tài khoản và hoạt động của bạn trên trang cộng đồng.</p>
      </header>

      {/* Thẻ thông tin tài khoản */}
      <div className="qp-acc-card">
        <div className="qp-acc-card__title">Thông tin tài khoản</div>
        <dl className="qp-acc-info">
          <div className="qp-acc-info__row"><dt>Tên hiển thị</dt><dd>{user.name || "—"}</dd></div>
          <div className="qp-acc-info__row"><dt>Email</dt><dd>{user.email}</dd></div>
          <div className="qp-acc-info__row"><dt>Vai trò</dt><dd>{isAdmin(user) ? "Quản trị viên" : isEditor(user) ? "Biên tập viên" : "Thành viên"}</dd></div>
          <div className="qp-acc-info__row"><dt>Trạng thái</dt><dd>{user.verified ? <span className="qp-acc-ok">✓ Đã xác minh email</span> : <span className="qp-acc-warn">Chưa xác minh email</span>}</dd></div>
          <div className="qp-acc-info__row"><dt>Ngày tham gia</dt><dd>{formatDate(user.createdAt.toISOString())}</dd></div>
        </dl>
        <Link href="/tai-khoan/cai-dat" className="qp-btn-outline mt-4">Chỉnh sửa thông tin</Link>
      </div>

      {/* Thống kê bài đăng */}
      <div className="qp-acc-stats">
        <Stat value={posts.length} label="Tổng bài đăng" />
        <Stat value={pending} label="Đang chờ duyệt" warn={pending > 0} />
        <Stat value={bySection("tim-do-roi")} label="Tìm đồ rơi" />
        <Stat value={bySection("viec-lam")} label="Việc làm" />
        <Stat value={bySection("mua-ban")} label="Mua bán" />
      </div>

      {/* Bài đăng gần đây */}
      <div className="qp-acc-card">
        <div className="qp-acc-card__title qp-acc-card__title--row">
          Bài đăng gần đây
          {posts.length > 0 && <Link href="/tai-khoan/bai-dang" className="qp-acc-card__more">Xem tất cả →</Link>}
        </div>
        {recent.length === 0 ? (
          <div className="qp-empty">
            <div className="qp-empty__title">Bạn chưa có bài đăng nào</div>
            <p className="type-body-small">Đăng tin tại <Link href="/tim-do-roi">Tìm đồ rơi</Link>, <Link href="/viec-lam">Việc làm</Link> hoặc <Link href="/mua-ban">Mua bán</Link>.</p>
          </div>
        ) : (
          <ul className="qp-acc-list">
            {recent.map((p) => (
              <li key={`${p.section}-${p.slug}`} className="qp-acc-list__row">
                <Link href={p.href} className="qp-acc-list__media" aria-hidden tabIndex={-1}>
                  {p.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.image} alt="" loading="lazy" />
                    : <span className="qp-acc-list__ph">{p.sectionLabel[0]}</span>}
                </Link>
                <div className="qp-acc-list__main">
                  <Link href={p.href} className="qp-acc-list__title">{p.title}</Link>
                  <div className="qp-acc-list__meta">
                    <span className="qp-tag-cat">{p.sectionLabel}</span>
                    <span className={`qp-acc-badge is-${p.state}`}>{p.statusLabel}</span>
                    <span className="qp-acc-list__date">{formatDate(p.createdAt)} · {p.views} lượt xem</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, warn = false }: { value: number; label: string; warn?: boolean }) {
  return (
    <div className={`qp-acc-stat${warn ? " is-warn" : ""}`}>
      <div className="qp-acc-stat__value">{value}</div>
      <div className="qp-acc-stat__label">{label}</div>
    </div>
  );
}
