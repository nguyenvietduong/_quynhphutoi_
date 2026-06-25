import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MediaManager } from "@/components/admin/MediaManager";
import { cloudinaryConfigured, FOLDER } from "@/lib/media";
import { getModulePerm } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Thư viện ảnh — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const perm = await getModulePerm("media");
  if (!perm || perm === "none") redirect("/admin");

  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Hệ thống</span>
        <h1 className="type-h1">Thư viện ảnh</h1>
        <p className="qp-admin-head__desc">
          {cloudinaryConfigured
            ? `Quản lý ảnh trên Cloudinary — folder: ${FOLDER}`
            : "Chưa cấu hình Cloudinary. Thêm CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET vào .env.local."}
        </p>
      </div>
      <MediaManager configured={cloudinaryConfigured} perm={perm} />
    </>
  );
}
