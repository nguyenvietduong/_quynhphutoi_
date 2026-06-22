import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { NotifyComposer } from "@/components/admin/NotifyComposer";

export const metadata: Metadata = { title: "Thông báo — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminNotifyPage() {
  await requireAdminPage();
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Hệ thống</span>
        <h1 className="type-h1">Thông báo</h1>
        <p className="qp-admin-head__desc">Xem thông báo nhận được hoặc gửi thông báo tới người dùng.</p>
      </div>
      <NotifyComposer />
    </>
  );
}
