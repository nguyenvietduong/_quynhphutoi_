import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import { listSchools, countByLevel } from "@/lib/schools";
import { getAdminUnitsMap } from "@/lib/admin-units";
import { SchoolBrowser, type SchoolItem } from "@/components/schools/SchoolBrowser";

export const metadata = buildMetadata({
  title: "Trường học xã Quỳnh Phụ",
  description:
    "Danh bạ trường học xã Quỳnh Phụ, Thái Bình — mầm non, tiểu học, THCS, THPT và GDTX theo từng xã, thị trấn.",
  path: "/truong-hoc",
});

// Đọc dữ liệu từ MongoDB tại thời điểm request.
export const dynamic = "force-dynamic";

// Thứ tự bậc học để sắp xếp hiển thị.
const LEVEL_ORDER: Record<string, number> = { "mam-non": 1, "tieu-hoc": 2, thcs: 3, thpt: 4 };

export default async function TruongHocPage() {
  const [docs, byLevel, units] = await Promise.all([listSchools({}), countByLevel(), getAdminUnitsMap()]);

  // Map sang DTO thuần (bỏ ObjectId/Date) — resolve địa chỉ từ admin_units qua wardSlug.
  const items: SchoolItem[] = docs
    .map((d) => {
      const u = units.get(d.wardSlug);
      return {
        slug: d.slug,
        name: d.name,
        level: d.level,
        levels: d.levels,
        levelLabel: d.levelLabel,
        type: d.type,
        ward: u?.name ?? d.wardSlug,
        wardSlug: d.wardSlug,
        newCommune: u?.newCommune ?? null,
        newCommuneSlug: u?.newCommuneSlug ?? null,
        address: d.address ?? "",
        website: d.website ?? null,
        foundedYear: d.foundedYear ?? null,
        verified: d.verified,
      };
    })
    .sort((a, b) => (LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]) || a.ward.localeCompare(b.ward, "vi") || a.name.localeCompare(b.name, "vi"));

  // Danh sách xã/thị trấn (duy nhất) cho bộ lọc.
  const wardMap = new Map<string, string>();
  for (const it of items) if (!wardMap.has(it.wardSlug)) wardMap.set(it.wardSlug, it.ward);
  const wards = [...wardMap.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  // Danh sách xã MỚI (sau sáp nhập 2025) cho bộ lọc.
  const newMap = new Map<string, string>();
  for (const it of items) if (it.newCommuneSlug && !newMap.has(it.newCommuneSlug)) newMap.set(it.newCommuneSlug, it.newCommune!);
  const newCommunes = [...newMap.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const counts = {
    all: items.length,
    "mam-non": byLevel["mam-non"],
    "tieu-hoc": byLevel["tieu-hoc"],
    thcs: byLevel.thcs,
    thpt: byLevel.thpt,
  };

  return (
    <>
      <section className="qp-pagehero" aria-labelledby="th-title">
        <span className="qp-pagehero__blob is-teal" aria-hidden />
        <span className="qp-pagehero__blob is-indigo" aria-hidden />
        <span className="qp-pagehero__blob is-yellow" aria-hidden />
        <span className="qp-pagehero__art" aria-hidden />
        <div className="container-wide qp-pagehero__inner">
          <nav className="qp-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span className="qp-breadcrumb__sep">›</span>
            <span className="qp-breadcrumb__current">Trường học</span>
          </nav>
          <span className="type-tag qp-pagehero__eyebrow">Dịch vụ công · Giáo dục</span>
          <h1 id="th-title" className="type-h1">Trường học xã Quỳnh Phụ</h1>
          <p className="qp-pagehero__lead">
            Danh bạ trường học trên địa bàn huyện — từ mầm non, tiểu học, THCS đến THPT và GDTX,
            tra cứu theo cấp học và theo xã, thị trấn.
          </p>
          <span className="qp-pagehero__line" aria-hidden />
        </div>
      </section>

      {/* KPI: số trường theo bậc học */}
      <section className="qp-kpi-strip">
        <div className="container-wide">
          <div className="qp-kpi-grid">
            <Kpi value={counts["mam-non"]} unit="trường" label="Mầm non" />
            <Kpi value={counts["tieu-hoc"]} unit="trường" label="Tiểu học" />
            <Kpi value={counts.thcs} unit="trường" label="Trung học cơ sở" />
            <Kpi value={counts.thpt} unit="cơ sở" label="THPT & GDTX" />
          </div>
        </div>
      </section>

      <section className="qp-newsmain">
        <div className="container-wide">
          <SchoolBrowser items={items} wards={wards} newCommunes={newCommunes} counts={counts} />
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
