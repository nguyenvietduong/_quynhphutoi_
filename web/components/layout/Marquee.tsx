import { loadMarquee } from "@/lib/home-sections";

// Server component — dải "Cập nhật mới" chạy ngang, lấy tiêu đề bài viết theo cấu hình
// admin (Trang chủ → Dải chạy: mới nhất/ngẫu nhiên/chọn thủ công). Track lặp 2 lần để
// CSS animation chạy loop liền mạch. Tắt khối hoặc không có bài → ẩn hẳn dải.
export async function Marquee() {
  const titles = await loadMarquee().catch(() => []);
  if (titles.length === 0) return null;

  const items = [...titles, ...titles];
  return (
    <div className="qp-marquee" aria-label="Tin cập nhật mới">
      <div className="container-wide qp-marquee__inner">
        <span className="qp-marquee__label">Cập nhật mới</span>
        <div className="qp-marquee__viewport">
          <div className="qp-marquee__track">
            {items.map((t, i) => (
              <span className="qp-marquee__item" key={i} aria-hidden={i >= titles.length}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
