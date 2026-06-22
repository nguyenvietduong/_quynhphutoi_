// Layout khu quản trị — shell sidebar riêng, KHÔNG chrome public (TopBar/Footer).
// Guard tập trung: chưa đăng nhập / không phải admin → đẩy về trang đăng nhập.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/admin";
import { isStaff } from "@/lib/users";
import { countPendingJobs } from "@/lib/jobs";
import { countPending as countPendingLostFound } from "@/lib/lostfound";
import { countPendingClassifieds } from "@/lib/classifieds";
import { getSettings } from "@/lib/settings";
import { AdminSidebar, type AdminCounts } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import "@/styles/admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!isStaff(user)) redirect("/dang-nhap?next=/admin");

  const [jb, lf, mb, settings] = await Promise.all([
    countPendingJobs(),
    countPendingLostFound(),
    countPendingClassifieds(),
    getSettings(),
  ]);
  const counts: AdminCounts = { "viec-lam": jb, "tim-do-roi": lf, "mua-ban": mb };

  return (
    <div className="qp-admin-shell">
      <AdminSidebar counts={counts} logo={settings.siteLogo || undefined} role={user!.role ?? "user"} />
      <div className="qp-admin-main">
        <AdminTopbar name={user!.name} email={user!.email} avatar={user!.avatar} />
        <div className="qp-admin-content">{children}</div>
      </div>
    </div>
  );
}
