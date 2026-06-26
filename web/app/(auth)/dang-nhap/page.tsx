import type { Metadata } from "next";
import { Suspense } from "react";
import "@/styles/auth.css";
import { LeafArt } from "@/components/auth/LeafArt";
import { BrandCorner } from "@/components/auth/BrandCorner";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào Trang cộng đồng Quỳnh Phụ.",
  robots: { index: false, follow: false },
};

export default function DangNhapPage() {
  return (
    <section className="wm-login">
      <div className="card">
        {/* ========== CHIẾC LÁ CHÉO ========== */}
        <LeafArt />

        {/* BRAND CORNER — bấm về trang chủ */}
        <BrandCorner />

        {/* FORM PANEL */}
        <Suspense fallback={<div className="form-panel" />}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
