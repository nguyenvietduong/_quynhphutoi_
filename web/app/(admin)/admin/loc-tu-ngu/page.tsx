import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listProfanityWords, seedProfanityWords, toProfanityRow } from "@/lib/profanity";
import { ProfanityManager } from "@/components/admin/ProfanityManager";
import { getModulePerm } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Lọc từ ngữ — Quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminProfanityPage() {
  const perm = await getModulePerm("loc-tu-ngu");
  if (!perm || perm === "none") redirect("/admin/403");

  let docs = await listProfanityWords();
  if (docs.length === 0) { await seedProfanityWords(); docs = await listProfanityWords(); }
  const rows = docs.map(toProfanityRow);
  return (
    <>
      <div className="qp-admin-head">
        <span className="qp-admin-head__eyebrow">Kiểm duyệt</span>
        <h1 className="type-h1">Lọc từ ngữ thô tục</h1>
        <p className="qp-admin-head__desc">
          Tin đăng dính từ trong danh sách sẽ <b>không được tự động duyệt</b> mà giữ lại chờ admin xem; bình luận dính từ tục bị <b>từ chối</b>. Bật/tắt bộ lọc tổng ở trang <a href="/admin/cai-dat" style={{ color: "var(--color-navy)", fontWeight: 600, textDecoration: "underline" }}>Cài đặt</a>.
        </p>
      </div>
      <ProfanityManager initial={rows} perm={perm} />
    </>
  );
}
