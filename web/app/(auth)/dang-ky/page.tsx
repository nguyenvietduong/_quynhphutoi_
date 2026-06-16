import type { Metadata } from "next";
import "@/styles/auth.css";
import { LeafArt } from "@/components/auth/LeafArt";
import { BrandCorner } from "@/components/auth/BrandCorner";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Đăng ký",
  description: "Tạo tài khoản Cổng thông tin Quỳnh Phụ.",
  robots: { index: false, follow: false },
};

export default function DangKyPage() {
  return (
    <section className="wm-login">
      <div className="card card--register">
        {/* ========== CHIẾC LÁ CHÉO ========== */}
        <LeafArt />

        {/* BRAND CORNER — bấm về trang chủ */}
        <BrandCorner />

        {/* FORM PANEL */}
        <RegisterForm />
      </div>
    </section>
  );
}
