import type { Metadata } from "next";
import { Suspense } from "react";
import "@/styles/auth.css";
import { LeafArt } from "@/components/auth/LeafArt";
import { BrandCorner } from "@/components/auth/BrandCorner";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu",
  description: "Đặt mật khẩu mới cho tài khoản Cổng thông tin Quỳnh Phụ.",
  robots: { index: false, follow: false },
};

export default function DatLaiMatKhauPage() {
  return (
    <section className="wm-login">
      <div className="card">
        {/* ========== CHIẾC LÁ CHÉO ========== */}
        <LeafArt />

        {/* BRAND CORNER — bấm về trang chủ */}
        <BrandCorner />

        {/* FORM PANEL */}
        <Suspense fallback={<div className="form-panel" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </section>
  );
}
