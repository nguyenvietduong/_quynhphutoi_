// Tìm kiếm toàn cục trong khu quản trị.
// - Admin: tìm tất cả module.
// - Editor: chỉ tìm module có quyền >= view.
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { isAdmin } from "@/lib/users";
import { getRolePermissions, hasPerm, type ModuleKey } from "@/lib/role-permissions";
import { listArticles } from "@/lib/articles";
import { listUsers } from "@/lib/users";
import { listJobs } from "@/lib/jobs";
import { listClassifieds } from "@/lib/classifieds";
import { listPosts } from "@/lib/lostfound";

export async function GET(req: Request) {
  const g = await requireStaff();
  if (g instanceof NextResponse) return g;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: {} });

  // Kiểm tra quyền theo module cho editor
  const admin = isAdmin(g.user);
  let canAccess: (key: ModuleKey) => boolean = () => true;
  if (!admin) {
    const config = await getRolePermissions();
    const perms = config.editor;
    canAccess = (key) => hasPerm(perms[key] ?? "none", "view");
  }

  const LIMIT = 5;

  const [articles, users, jobs, classifieds, lostfound] = await Promise.all([
    canAccess("tin-tuc")    ? listArticles({ search: q, limit: LIMIT }).catch(() => [])    : [],
    canAccess("nguoi-dung") ? listUsers({ search: q, limit: LIMIT }).catch(() => [])        : [],
    canAccess("viec-lam")   ? listJobs({ search: q, limit: LIMIT }).catch(() => [])         : [],
    canAccess("mua-ban")    ? listClassifieds({ search: q, limit: LIMIT }).catch(() => [])  : [],
    canAccess("tim-do-roi") ? listPosts({ search: q, limit: LIMIT }).catch(() => [])        : [],
  ]);

  return NextResponse.json({
    results: {
      articles: articles.map(a => ({
        id:       String(a._id),
        title:    a.title,
        slug:     a.slug,
        sub:      a.slug,
        approved: a.approved,
        href:     `/admin/tin-tuc/bai-viet/${a.slug}`,
      })),
      users: users.map(u => ({
        id:   String(u._id),
        title: u.name,
        sub:  u.email,
        role: u.role,
        href: `/admin/nguoi-dung`,
      })),
      jobs: jobs.map(j => ({
        id:    String(j._id),
        title: j.title,
        sub:   j.company,
        slug:  j.slug,
        href:  `/admin/viec-lam`,
      })),
      classifieds: classifieds.map(c => ({
        id:    String(c._id),
        title: c.title,
        sub:   c.categoryLabel,
        slug:  c.slug,
        href:  `/admin/mua-ban`,
      })),
      lostfound: lostfound.map(l => ({
        id:    String(l._id),
        title: l.title,
        sub:   l.kind === "tim-do" ? "Đồ mất" : "Nhặt được",
        slug:  l.slug,
        href:  `/admin/tim-do-roi`,
      })),
    },
  });
}
