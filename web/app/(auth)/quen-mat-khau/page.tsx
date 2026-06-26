import type { Metadata } from "next";
import "@/styles/auth.css";
import { LeafArt } from "@/components/auth/LeafArt";
import { BrandCorner } from "@/components/auth/BrandCorner";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Quên mật khẩu",
  description: "Khôi phục mật khẩu tài khoản Trang cộng đồng Quỳnh Phụ.",
  robots: { index: false, follow: false },
};

export default function QuenMatKhauPage() {
  return (
    <section className="wm-login">
      <div className="card">
        {/* ========== CHIẾC LÁ CHÉO ========== */}
        <LeafArt />

        {/* BRAND CORNER — bấm về trang chủ */}
        <BrandCorner />

        {/* FORM PANEL */}
        <ForgotPasswordForm />
      </div>
    </section>
  );
}
