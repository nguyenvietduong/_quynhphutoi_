// Layout cho khối trang cổng thông tin — kèm chrome đầy đủ.
// Mọi trang công khai (/, /tin-tuc, /lien-he…) nằm trong nhóm (site) này.
import { TopBar } from "@/components/layout/TopBar";
import { Marquee } from "@/components/layout/Marquee";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/layout/BackToTop";
import { StickyAdBar } from "@/components/ads/StickyAdBar";
import { getSession } from "@/lib/auth";
import { isCurrentUserStaff } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { findById } from "@/lib/users";
import { RULES_VERSION } from "@/lib/rules";
import { RulesGate } from "@/components/site/RulesGate";
import { WarningModal } from "@/components/account/WarningModal";
import { getActiveWarnings } from "@/lib/user-warnings";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // "staff" = admin hoặc biên tập viên → hiện lối tắt vào khu /admin trên menu tài khoản.
  const [user, staff, settings] = await Promise.all([getSession(), isCurrentUserStaff(), getSettings()]);

  // Người dùng đã đăng nhập nhưng chưa đồng ý nội quy (hoặc đồng ý phiên bản cũ) → hiện modal.
  let needsRules = false;
  let activeWarnings: Awaited<ReturnType<typeof getActiveWarnings>> = [];
  let isBanned = false;
  if (user?.id) {
    const doc = await findById(user.id);
    needsRules = !!doc && (doc.rulesAgreedVersion ?? 0) < RULES_VERSION;
    isBanned = doc?.banned === true;
    if ((doc?.warnCount ?? 0) > 0) {
      activeWarnings = await getActiveWarnings(user.id);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Bỏ qua tới nội dung
      </a>
      <TopBar user={user} isAdmin={staff} logo={settings.siteLogo || undefined} />
      <Marquee />
      <main id="main">{children}</main>
      <Footer />
      <BackToTop />
      <StickyAdBar />
      {user ? <RulesGate needsAgreement={needsRules} /> : null}
      {user && activeWarnings.length > 0
        ? <WarningModal initialWarnings={activeWarnings} isBanned={isBanned} />
        : null}
    </>
  );
}
