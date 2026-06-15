import { pageMetadata } from "@/lib/page-seo";
import Link from "next/link";
import { listPosts, listMyPosts, type LostFoundDoc } from "@/lib/lostfound";
import { getSession } from "@/lib/auth";
import { getTree, type CategoryNode } from "@/lib/categories";
import { stripHtml } from "@/lib/strip-html";
import { WARDS } from "@/lib/wards";
import { getAdminUnitsMap, type AdminUnit } from "@/lib/admin-units";
import { LostFoundBrowser, type LostFoundItem } from "@/components/lostfound/LostFoundBrowser";
import { getSettings } from "@/lib/settings";
import type { CategoryOption } from "@/components/lostfound/PostModal";

export async function generateMetadata() {
  return pageMetadata({
    key: "/tim-do-roi", path: "/tim-do-roi",
    title: "Tìm đồ rơi — Quỳnh Phụ",
    description:
      "Bảng tin tìm đồ rơi xã Quỳnh Phụ: đăng tin tìm đồ bị mất và tin nhặt được đồ để trả lại người mất. Lọc theo danh mục, xã/thị trấn.",
  });
}

// Đọc dữ liệu từ MongoDB tại thời điểm request.
export const dynamic = "force-dynamic";

// Làm phẳng cây danh mục thành các option lá (node không có con) cho select,
// nhãn kèm danh mục cha cho rõ nghĩa: "Giấy tờ tuỳ thân › CCCD".
function flattenLeaves(nodes: CategoryNode[], trail: string[] = []): CategoryOption[] {
  const out: CategoryOption[] = [];
  for (const n of nodes) {
    const path = [...trail, n.name];
    if (n.children.length) out.push(...flattenLeaves(n.children, path));
    else out.push({ id: n._id!.toString(), label: path.join(" › ") });
  }
  return out;
}

// Map doc → DTO thuần cho client. Resolve địa chỉ từ admin_units qua wardSlug.
function toItem(d: LostFoundDoc, units: Map<string, AdminUnit>, showPhone = false): LostFoundItem {
  const u = units.get(d.location.wardSlug);
  return {
    slug: d.slug,
    kind: d.kind,
    title: d.title,
    description: stripHtml(d.description),  // preview text (mô tả lưu dạng HTML)
    categorySlug: d.categorySlug,
    categoryName: d.categoryName,
    images: d.images ?? [],
    ward: u?.name ?? d.location.wardSlug,
    wardSlug: d.location.wardSlug,
    newCommune: u?.newCommune ?? null,
    occurredAt: d.occurredAt.toISOString(),
    createdAt: d.createdAt.toISOString(),
    reward: d.reward ?? null,
    status: d.status,
    views: d.views,
    postedByName: d.postedByName,
    phone: showPhone || !d.contact.hidePhone ? d.contact.phone : null,
  };
}

export default async function TimDoRoiPage() {
  const [docs, session, tree, units, settings] = await Promise.all([
    // Chỉ tin đã duyệt + đang hoạt động (mặc định approvedOnly).
    listPosts({ limit: 500 }),
    getSession(),
    getTree("tim-do-roi", { activeOnly: true }),
    getAdminUnitsMap(),
    getSettings(),
  ]);
  const categoryOptions = flattenLeaves(tree);

  const items: LostFoundItem[] = docs.map((d) => toItem(d, units));

  // Tin chờ duyệt của CHÍNH người đang đăng nhập (approved=false).
  const pendingItems: LostFoundItem[] = session
    ? (await listMyPosts(session.id))
        .filter((d) => !d.approved && d.active)
        .map((d) => toItem(d, units, true))
    : [];

  // Danh mục (duy nhất) cho bộ lọc.
  const catMap = new Map<string, string>();
  for (const it of items) if (!catMap.has(it.categorySlug)) catMap.set(it.categorySlug, it.categoryName);
  const categories = [...catMap.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  // Xã / thị trấn cho bộ lọc — ĐỦ 35 đơn vị (không chỉ xã có tin).
  const wards = WARDS.map((w) => ({ slug: w.slug, name: w.name, newCommune: w.newCommune }));

  const counts = {
    all: items.length,
    "tim-do": items.filter((i) => i.kind === "tim-do").length,
    "nhat-duoc": items.filter((i) => i.kind === "nhat-duoc").length,
  };

  return (
    <>
      <section className="qp-pagehero" aria-labelledby="lf-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Tìm đồ rơi</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Tiện ích cộng đồng</span>
          <h1 id="lf-title" className="type-h1">Tìm đồ rơi</h1>
          <p className="qp-pagehero__lead">
            Bảng tin của người dân Quỳnh Phụ — đăng tin <b>tìm đồ bị mất</b> hoặc tin
            <b> nhặt được đồ</b> để trả lại người mất. Lọc theo danh mục và xã, thị trấn.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      <section className="qp-kpi-strip">
        <div className="container-wide">
          <div className="qp-kpi-grid">
            <Kpi value={counts.all} unit="tin" label="Tổng số tin" />
            <Kpi value={counts["tim-do"]} unit="tin" label="Đang tìm đồ" />
            <Kpi value={counts["nhat-duoc"]} unit="tin" label="Nhặt được đồ" />
          </div>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <LostFoundBrowser
            items={items}
            pendingItems={pendingItems}
            categories={categories}
            wards={wards}
            counts={counts}
            categoryOptions={categoryOptions}
            isLoggedIn={!!session}
            defaultName={session?.name ?? ""}
            maxImages={settings.postMaxImages}
          />
        </div>
      </section>
    </>
  );
}

function Kpi({ value, unit, label }: { value: number; unit: string; label: string }) {
  return (
    <div className="qp-kpi">
      <div className="qp-kpi__value">
        <span className="num">{value}</span>
        <span className="unit">{unit}</span>
      </div>
      <div className="qp-kpi__label">{label}</div>
    </div>
  );
}
