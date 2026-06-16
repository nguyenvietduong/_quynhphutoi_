import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/admin";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PasswordForm } from "@/components/account/PasswordForm";

export const metadata: Metadata = { title: "Cài đặt tài khoản — Quỳnh Phụ Tôi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=/tai-khoan/cai-dat");

  return (
    <div className="qp-acc-page">
      <header className="qp-acc-page__head">
        <h2 className="type-h2">Cài đặt tài khoản</h2>
        <p className="type-body-small text-muted">Cập nhật thông tin hiển thị và đổi mật khẩu đăng nhập.</p>
      </header>

      <div className="qp-acc-grid2">
        <div className="qp-acc-card">
          <div className="qp-acc-card__title">Thông tin tài khoản</div>
          <ProfileForm initialName={user.name} email={user.email} />
        </div>

        <div className="qp-acc-card">
          <div className="qp-acc-card__title">Đổi mật khẩu</div>
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
