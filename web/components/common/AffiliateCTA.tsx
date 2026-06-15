// Link "… Xem thêm" affiliate Shopee — kiểu "đọc tiếp" inline đặt cuối phần mô tả,
// KHÔNG phải box. Server component, tự đọc cấu hình; ẩn nếu admin tắt/chưa có link.
// Link trỏ qua /di/shopee (random + cloaking).
import { getAffiliateConfig } from "@/lib/affiliate";

export async function AffiliateCTA() {
  const cfg = await getAffiliateConfig().catch(() => null);
  if (!cfg || !cfg.enabled || cfg.links.length === 0) return null;
  return (
    <p className="qp-affiliate-more">
      <span className="qp-affiliate-more__dots" aria-hidden>… </span>
      <a
        className="qp-affiliate-more__link"
        href="/di/shopee"
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
      >
        {cfg.label}
      </a>
      {cfg.note ? <span className="qp-affiliate-more__note"> · {cfg.note}</span> : null}
    </p>
  );
}
