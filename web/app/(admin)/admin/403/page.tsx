import type { Metadata } from "next";
import { ForbiddenContent } from "@/components/admin/ForbiddenContent";

export const metadata: Metadata = { title: "Không có quyền — Quản trị", robots: { index: false, follow: false } };

export default function AdminForbiddenPage() {
  return <ForbiddenContent />;
}
