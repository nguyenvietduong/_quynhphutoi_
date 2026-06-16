import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/admin";
import { getMyPosts } from "@/lib/my-posts";
import { MyPosts } from "@/components/account/MyPosts";

export const metadata: Metadata = { title: "Bài đăng của tôi — Quỳnh Phụ Tôi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MyPostsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=/tai-khoan/bai-dang");

  const posts = await getMyPosts(String(user._id));

  return (
    <div className="qp-acc-page">
      <header className="qp-acc-page__head">
        <h2 className="type-h2">Bài đăng của tôi</h2>
        <p className="type-body-small text-muted">Tất cả tin bạn đã đăng ở Tìm đồ rơi, Việc làm và Mua bán — kèm trạng thái duyệt.</p>
      </header>
      <MyPosts items={posts} />
    </div>
  );
}
