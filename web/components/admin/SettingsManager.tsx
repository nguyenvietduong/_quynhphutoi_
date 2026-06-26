"use client";

// Cấu hình hệ thống — full trang, tab dọc + công tắc gạt. Lưu DB, áp dụng ngay.
import { useState } from "react";
import type { AppSettings } from "@/lib/settings";
import { useToast } from "@/components/common/Toast";
import { ImageUploader } from "@/components/common/ImageUploader";

type Tab = "post" | "comment" | "security" | "contact" | "seo" | "brand" | "news" | "ai" | "data";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "post", label: "Đăng tin", icon: "📝" },
  { key: "comment", label: "Bình luận & tương tác", icon: "💬" },
  { key: "security", label: "Bảo mật & tài khoản", icon: "🔒" },
  { key: "contact", label: "Liên hệ & chung", icon: "📞" },
  { key: "seo", label: "SEO toàn site", icon: "🔎" },
  { key: "brand", label: "Thương hiệu (Logo)", icon: "🖼️" },
  { key: "news", label: "Nguồn tin ngoài", icon: "🌐" },
  { key: "ai", label: "AI & nội dung", icon: "✨" },
  { key: "data", label: "Dữ liệu mẫu", icon: "🌱" },
];

export function SettingsManager({ initial }: { initial: AppSettings }) {
  const [form, setForm] = useState<AppSettings>(initial);
  const [tab, setTab] = useState<Tab>("post");
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  function set<K extends keyof AppSettings>(k: K, v: AppSettings[K]) { setForm((f) => ({ ...f, [k]: v })); }
  const num = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never);
  const txt = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value as never);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Lưu thất bại."); return; }
      if (data.settings) setForm(data.settings);
      toast.success("Đã lưu cấu hình. Áp dụng ngay cho lượt truy cập tiếp theo.");
    } finally { setBusy(false); }
  }

  async function seedDemo() {
    if (seeding) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Nạp dữ liệu thất bại."); return; }
      const report: { label: string; status: string; count: number }[] = data.report ?? [];
      const seeded = report.filter((r) => r.status === "seeded");
      const skipped = report.filter((r) => r.status === "skipped");
      if (seeded.length) toast.success(`Đã nạp: ${seeded.map((r) => `${r.label} (${r.count})`).join(", ")}.`);
      if (skipped.length) toast.info(`Bỏ qua (đã có dữ liệu): ${skipped.map((r) => r.label).join(", ")}.`);
      if (!seeded.length && !skipped.length) toast.info("Không có gì để nạp.");
    } catch {
      toast.error("Lỗi kết nối khi nạp dữ liệu.");
    } finally { setSeeding(false); }
  }

  const Toggle = ({ k, label, desc, warn }: { k: keyof AppSettings; label: string; desc?: string; warn?: boolean }) => (
    <label className="qp-switch-row">
      <span className="qp-switch-row__text"><b>{label}</b>{desc && <small>{desc}</small>}</span>
      <span className={`qp-switch${warn ? " is-warn" : ""}`}>
        <input type="checkbox" checked={form[k] as boolean} onChange={(e) => set(k, e.target.checked as never)} />
        <span className="qp-switch__track" />
      </span>
    </label>
  );

  return (
    <form className="qp-settings" onSubmit={submit}>
      <nav className="qp-settings__nav">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`qp-settings__tab${tab === t.key ? " is-active" : ""}`} onClick={() => setTab(t.key)}>
            <span aria-hidden>{t.icon}</span> {t.label}
          </button>
        ))}
        <button type="submit" className="qp-btn-primary qp-btn-block" disabled={busy} style={{ marginTop: "var(--space-4)" }}>
          {busy ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
      </nav>

      <div className="qp-settings__panel">
        {tab === "post" && (
          <>
            <Card title="Hạn mức đăng tin" desc="Chống spam — áp dụng chung cho Việc làm · Tìm đồ rơi · Mua bán.">
              <div className="qp-acc-grid2">
                <Field label="Số tin tối đa / ngày / người" hint="Hết hạn mức → đợi sang hôm sau.">
                  <input type="number" min={1} max={100} className="qp-input" value={form.postDailyMax} onChange={num("postDailyMax")} />
                </Field>
                <Field label="Số ảnh tối đa mỗi tin">
                  <input type="number" min={1} max={20} className="qp-input" value={form.postMaxImages} onChange={num("postMaxImages")} />
                </Field>
                <Field label="Số ảnh tối đa mỗi quảng cáo" hint="Thư viện ảnh hiển thị ở trang chi tiết quảng cáo.">
                  <input type="number" min={1} max={20} className="qp-input" value={form.adMaxImages} onChange={num("adMaxImages")} />
                </Field>
                <Field label="Thời gian chờ cơ bản (phút)" hint="Khoảng cách tối thiểu giữa 2 tin.">
                  <input type="number" min={0} max={1440} className="qp-input" value={form.postCooldownMin} onChange={num("postCooldownMin")} />
                </Field>
                <Field label="Trần thời gian chờ (phút)" hint="Đăng liên tục → chờ tăng dần tới mức này.">
                  <input type="number" min={0} max={1440} className="qp-input" value={form.postCooldownMax} onChange={num("postCooldownMax")} />
                </Field>
              </div>
            </Card>
            <Card title="Kiểm duyệt & phân hệ" desc="Bật/tắt nhanh từng tính năng đăng tin.">
              <Toggle k="postRequireApproval" label="Bắt buộc duyệt tin" desc="Bật: tin chỉ hiện sau khi admin duyệt. Tắt: tự động duyệt — tin sạch hiện ngay, tin dính từ tục vẫn được giữ chờ duyệt." warn={!form.postRequireApproval} />
              <Toggle k="jobsPostEnabled" label="Cho phép đăng Việc làm" />
              <Toggle k="lostfoundPostEnabled" label="Cho phép đăng Tìm đồ rơi" />
              <Toggle k="classifiedsPostEnabled" label="Cho phép đăng Mua bán" />
              <Toggle k="newsPostEnabled" label="Cho phép gửi bài Tin tức" desc="Người dùng gửi bài viết; hiển thị sau khi admin duyệt." />
            </Card>
            <Card title="Lọc từ ngữ thô tục" desc="Tự động phát hiện từ chửi tục / xúc phạm. Tin đăng dính từ tục sẽ KHÔNG được tự động duyệt mà giữ lại chờ admin xem; bình luận dính từ tục bị từ chối, yêu cầu người dùng chỉnh sửa.">
              <Toggle k="profanityFilterEnabled" label="Bật lọc từ ngữ thô tục" desc="Áp dụng cho cả tin đăng và bình luận toàn site." warn={!form.profanityFilterEnabled} />
              <p className="qp-form-tip" style={{ marginTop: 12 }}>
                Quản lý danh sách từ cấm (thêm / sửa / xoá) tại trang{" "}
                <a href="/admin/loc-tu-ngu" style={{ color: "var(--color-navy)", fontWeight: 600, textDecoration: "underline" }}>Lọc từ ngữ</a>.
              </p>
            </Card>
          </>
        )}

        {tab === "comment" && (
          <Card title="Bình luận & tương tác">
            <Toggle k="commentsEnabled" label="Cho phép bình luận" desc="Áp dụng toàn site (tin tức, tìm đồ rơi, các trang chi tiết)." />
            <Toggle k="likesEnabled" label="Cho phép thích (like)" />
            <div className="qp-acc-grid2" style={{ marginTop: 16 }}>
              <Field label="Độ dài tối đa 1 bình luận"><input type="number" min={50} max={5000} className="qp-input" value={form.commentMaxLength} onChange={num("commentMaxLength")} /></Field>
              <Field label="Số bình luận tối đa / phút / người"><input type="number" min={1} max={60} className="qp-input" value={form.commentMaxPerMin} onChange={num("commentMaxPerMin")} /></Field>
            </div>
          </Card>
        )}

        {tab === "security" && (
          <Card title="Bảo mật & tài khoản">
            <Field label={'reCAPTCHA v2 (ô tick "Tôi không phải robot")'} hint="Cấu hình bằng biến môi trường NEXT_PUBLIC_RECAPTCHA_SITE_KEY và RECAPTCHA_SECRET_KEY. Chưa đặt khóa thì các form vẫn gửi được (bỏ qua kiểm tra).">
              <span className="type-body-small" style={{ opacity: 0.7 }}>Form đăng ký / quên mật khẩu / đặt lại mật khẩu luôn yêu cầu ô tick. Các form còn lại chỉ hiện ô tick khi phát hiện thao tác bất thường (cùng một IP gửi quá nhiều lần trong thời gian ngắn).</span>
            </Field>
            <div style={{ marginTop: 8 }}>
              <Toggle k="registerEnabled" label="Cho phép đăng ký tài khoản mới" desc="Tắt để tạm dừng nhận tài khoản mới." />
            </div>
          </Card>
        )}

        {tab === "contact" && (
          <>
            <Card title="Thông tin liên hệ" desc="Hiển thị ở chân trang của cổng.">
              <div className="qp-acc-grid2">
                <Field label="Email liên hệ"><input type="email" maxLength={120} className="qp-input" value={form.contactEmail} onChange={txt("contactEmail")} /></Field>
                <Field label="Hotline (tuỳ chọn)"><input maxLength={40} className="qp-input" value={form.contactHotline} onChange={txt("contactHotline")} placeholder="VD: 0912 345 678" /></Field>
                <Field label="Địa điểm"><input maxLength={120} className="qp-input" value={form.contactLocation} onChange={txt("contactLocation")} /></Field>
                <Field label="Ghi chú liên hệ"><input maxLength={120} className="qp-input" value={form.contactNote} onChange={txt("contactNote")} /></Field>
              </div>
            </Card>
            <Card title="Mạng xã hội" desc="Để trống = ẩn biểu tượng tương ứng ở chân trang.">
              <div className="qp-acc-grid2">
                <Field label="Facebook URL"><input maxLength={200} className="qp-input" value={form.socialFacebook} onChange={txt("socialFacebook")} placeholder="https://facebook.com/..." /></Field>
                <Field label="YouTube URL"><input maxLength={200} className="qp-input" value={form.socialYoutube} onChange={txt("socialYoutube")} placeholder="https://youtube.com/..." /></Field>
                <Field label="Zalo URL"><input maxLength={200} className="qp-input" value={form.socialZalo} onChange={txt("socialZalo")} placeholder="https://zalo.me/..." /></Field>
              </div>
            </Card>
          </>
        )}

        {tab === "seo" && (
          <>
            <Card title="Nhận diện & metadata" desc="Áp dụng cho thẻ <title>, mô tả và ảnh chia sẻ của TOÀN site. Để trống ô nào → dùng giá trị mặc định cài sẵn. Có hiệu lực ngay, không cần build lại.">
              <Field label=”Tên site” hint=”Dùng cho tiêu đề mặc định và hậu tố mọi trang: “Tên trang · Tên site”. Trống = “Trang cộng đồng Quỳnh Phụ”.”>
                <input maxLength={80} className=”qp-input” value={form.seoSiteName} onChange={txt(“seoSiteName”)} placeholder=”Trang cộng đồng Quỳnh Phụ” />
              </Field>
              <Field label=”Mô tả mặc định” hint=”Hiển thị dưới tiêu đề trên Google cho trang chủ và trang không có mô tả riêng (≈ 160 ký tự).”>
                <textarea maxLength={300} className=”qp-textarea” value={form.seoSiteDescription} onChange={(e) => set(“seoSiteDescription”, e.target.value as never)} placeholder=”Trang cộng đồng Quỳnh Phụ — tin tức, việc làm, mua bán…” />
              </Field>
              <Field label="Từ khoá gốc (cách nhau dấu phẩy)" hint="Trống = bộ từ khoá mặc định về Quỳnh Phụ.">
                <textarea maxLength={400} className="qp-textarea" value={form.seoDefaultKeywords} onChange={(e) => set("seoDefaultKeywords", e.target.value as never)} placeholder="Quỳnh Phụ, Thái Bình, tin tức Quỳnh Phụ, việc làm Quỳnh Phụ…" />
              </Field>
              <Field label="Ảnh OG mặc định (URL)" hint="Ảnh khi chia sẻ link lên Facebook/Zalo. Trống = ảnh OG động tự sinh (/opengraph-image). Khuyến nghị 1200×630.">
                <input maxLength={500} className="qp-input" value={form.seoDefaultOgImage} onChange={txt("seoDefaultOgImage")} placeholder="/img/og-default.png hoặc https://…" />
              </Field>
            </Card>
            <Card title="Xác minh quyền sở hữu" desc="Dán mã xác minh để kết nối công cụ quản trị tìm kiếm. Mã được chèn vào thẻ <meta> ở mọi trang.">
              <div className="qp-acc-grid2">
                <Field label="Google Search Console" hint="Chỉ dán phần content của thẻ google-site-verification.">
                  <input maxLength={200} className="qp-input" value={form.seoVerificationGoogle} onChange={txt("seoVerificationGoogle")} placeholder="VD: abcDEF123…" />
                </Field>
                <Field label="Bing Webmaster" hint="Mã msvalidate.01.">
                  <input maxLength={200} className="qp-input" value={form.seoVerificationBing} onChange={txt("seoVerificationBing")} placeholder="VD: 0123ABC…" />
                </Field>
              </div>
            </Card>
          </>
        )}

        {tab === "brand" && (
          <Card title="Logo thương hiệu" desc="Tải lên logo hiển thị ở đầu trang (header), chân trang và trang đăng nhập; cùng logo nhỏ làm icon trên tab trình duyệt. Để trống = dùng logo mặc định. Áp dụng ngay cho lượt truy cập tiếp theo (icon tab có thể cần tải lại trang do trình duyệt cache).">
            <div className="qp-acc-grid2">
              <Field label="Logo chính" hint="Hiển thị ở header/footer/trang đăng nhập. Nên dùng ảnh vuông hoặc gần vuông, nền trong (PNG).">
                <ImageUploader value={form.siteLogo ? [form.siteLogo] : []} onChange={(a) => set("siteLogo", (a[0] ?? "") as never)} max={1} subfolder="system" />
              </Field>
              <Field label="Logo nhỏ (icon tab trình duyệt)" hint="Dùng làm favicon trên tab & PWA. Nên vuông ~512×512, PNG nền trong. Để trống = dùng Logo chính.">
                <ImageUploader value={form.siteFavicon ? [form.siteFavicon] : []} onChange={(a) => set("siteFavicon", (a[0] ?? "") as never)} max={1} subfolder="system" />
              </Field>
            </div>
          </Card>
        )}

        {tab === "news" && (
          <Card title="Tạo tin từ nguồn ngoài" desc="Bật để hiện nút “Tạo tin từ nguồn ngoài” ở trang quản trị Tin tức. Tin kéo về luôn ở trạng thái Bản nháp để bạn chỉnh sửa rồi mới xuất bản.">
            <Toggle k="newsImportEnabled" label="Bật tạo tin từ nguồn ngoài" desc="Phải BẬT công tắc này VÀ cấu hình nguồn bên dưới thì nút “Tạo tin từ nguồn ngoài” mới hiện ở trang Tin tức." />

            <div style={{ marginTop: 16 }}>
              <Field label="Nguồn lấy tin" hint="RSS báo VN: miễn phí, không cần khoá, chạy trên web thật — khuyến nghị. GNews: cần khoá nhưng gói free chạy được web thật (tìm theo từ khoá toàn web). NewsAPI: cần khoá, gói free CHỈ chạy localhost.">
                <select className="qp-input" value={form.newsSourceType} onChange={(e) => set("newsSourceType", e.target.value as never)}>
                  <option value="rss">RSS báo Việt Nam (miễn phí, chạy trên web thật)</option>
                  <option value="gnews">GNews.io (cần khoá API — free 100 lượt/ngày, chạy web thật)</option>
                  <option value="newsapi">NewsAPI.org (cần khoá API — free chỉ chạy localhost)</option>
                </select>
              </Field>
            </div>

            {form.newsSourceType === "rss" && (
              <div style={{ marginTop: 16 }}>
                <Field label="Danh sách RSS (mỗi dòng 1 link)" hint="Dán link RSS của các báo bạn muốn lấy tin. Có thể thêm/bớt tuỳ ý. VD: https://vnexpress.net/rss/thoi-su.rss">
                  <textarea
                    className="qp-textarea"
                    rows={5}
                    value={form.newsRssFeeds}
                    onChange={(e) => set("newsRssFeeds", e.target.value as never)}
                    placeholder={"https://vnexpress.net/rss/thoi-su.rss\nhttps://dantri.com.vn/rss/home.rss\nhttps://tuoitre.vn/rss/tin-moi-nhat.rss"}
                    style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                  />
                </Field>
                <Field label="Từ khoá lọc (tuỳ chọn)" hint="Để trống = lấy tin mới nhất từ các báo. Nhập từ khoá (VD: Quỳnh Phụ, Thái Bình) để chỉ giữ tin có chứa từ đó.">
                  <input maxLength={120} className="qp-input" value={form.newsApiQuery} onChange={txt("newsApiQuery")} placeholder="Để trống = tin mới nhất" />
                </Field>
                <p className="qp-form-tip" style={{ marginTop: 12 }}>
                  Mẹo: dùng RSS chuyên mục để tin sát nhu cầu hơn (thời sự, địa phương…). Báo lớn thường có trang “RSS” liệt kê link từng chuyên mục.
                </p>
              </div>
            )}

            {form.newsSourceType === "gnews" && (
              <div style={{ marginTop: 16 }}>
                <Field label="Khoá API (GNews key)" hint="Khoá lưu phía máy chủ và KHÔNG gửi lại về trình duyệt vì lý do bảo mật. Để trống = giữ khoá đã lưu (hoặc dùng env GNEWS_API_KEY nếu chưa lưu). Nhập khoá mới để thay. Lấy khoá miễn phí tại gnews.io (đăng ký → Dashboard → API key).">
                  {form.newsGnewsKeySet && (
                    <span className="qp-acc-badge is-active" style={{ marginBottom: 8, display: "inline-flex" }}>🔑 Đã lưu khoá API</span>
                  )}
                  <input type="password" autoComplete="off" maxLength={200} className="qp-input" value={form.newsGnewsKey} onChange={txt("newsGnewsKey")} placeholder={form.newsGnewsKeySet ? "Đã có khoá • nhập để thay khoá mới" : "Dán khoá API GNews tại đây…"} />
                </Field>
                <Field label="Từ khoá tìm (tuỳ chọn)" hint="Để trống = tin mới nhất ở Việt Nam (top headlines). Nhập từ khoá (VD: Quỳnh Phụ, Thái Bình) để tìm theo nội dung trên toàn web báo chí.">
                  <input maxLength={120} className="qp-input" value={form.newsApiQuery} onChange={txt("newsApiQuery")} placeholder="Để trống = tin mới nhất VN" />
                </Field>
                <p className="qp-form-tip" style={{ marginTop: 12 }}>
                  Lưu ý: gói miễn phí GNews giới hạn 100 lượt gọi/ngày và tối đa 10 bài mỗi lượt — đủ dùng cho việc tạo nháp thủ công.
                </p>
              </div>
            )}

            {form.newsSourceType === "newsapi" && (
              <div style={{ marginTop: 16 }}>
                <Field label="Khoá API (NewsAPI key)" hint="Khoá lưu phía máy chủ và KHÔNG gửi lại về trình duyệt vì lý do bảo mật. Để trống = giữ khoá đã lưu (hoặc dùng env NEWS_API_KEY nếu chưa lưu). Nhập khoá mới để thay. Lấy khoá tại newsapi.org/register.">
                  {form.newsApiKeySet && (
                    <span className="qp-acc-badge is-active" style={{ marginBottom: 8, display: "inline-flex" }}>🔑 Đã lưu khoá API</span>
                  )}
                  <input type="password" autoComplete="off" maxLength={200} className="qp-input" value={form.newsApiKey} onChange={txt("newsApiKey")} placeholder={form.newsApiKeySet ? "Đã có khoá • nhập để thay khoá mới" : "Dán khoá API tại đây…"} />
                </Field>
                <div className="qp-acc-grid2">
                  <Field label="Từ khoá tìm mặc định" hint="Hiển thị sẵn khi mở modal chọn tin.">
                    <input maxLength={120} className="qp-input" value={form.newsApiQuery} onChange={txt("newsApiQuery")} placeholder="Quỳnh Phụ" />
                  </Field>
                  <Field label="Endpoint (tuỳ chọn)" hint="Để trống = NewsAPI mặc định. Chỉ đổi nếu dùng proxy/API tương thích.">
                    <input maxLength={300} className="qp-input" value={form.newsApiUrl} onChange={txt("newsApiUrl")} placeholder="https://newsapi.org/v2/everything" />
                  </Field>
                </div>
                <p className="qp-form-tip" style={{ marginTop: 12 }}>
                  Lưu ý: gói miễn phí (Developer) của NewsAPI chỉ chạy ở môi trường localhost/dev, không dùng được trên domain production.
                </p>
              </div>
            )}
          </Card>
        )}

        {tab === "ai" && (
          <>
            <Card title="Gemini (Google)" desc="Miễn phí: 15 req/phút · 1 triệu token/ngày. Lấy key tại aistudio.google.com → Get API key.">
              <Field label="API key" hint="Lưu phía máy chủ, không gửi lại trình duyệt. Để trống = giữ khoá cũ (hoặc dùng env GEMINI_API_KEY).">
                {form.geminiApiKeySet && <span className="qp-acc-badge is-active" style={{ marginBottom: 8, display: "inline-flex" }}>🔑 Đã lưu khoá</span>}
                <input type="password" autoComplete="off" maxLength={200} className="qp-input"
                  value={form.geminiApiKey} onChange={txt("geminiApiKey")}
                  placeholder={form.geminiApiKeySet ? "Đã có khoá • nhập để thay" : "AIza..."} />
              </Field>
            </Card>

            <Card title="OpenAI / ChatGPT" desc="Trả phí theo token. Lấy key tại platform.openai.com → API keys.">
              <Field label="API key" hint="Để trống = giữ khoá cũ (hoặc dùng env OPENAI_API_KEY).">
                {form.openaiApiKeySet && <span className="qp-acc-badge is-active" style={{ marginBottom: 8, display: "inline-flex" }}>🔑 Đã lưu khoá</span>}
                <input type="password" autoComplete="off" maxLength={200} className="qp-input"
                  value={form.openaiApiKey} onChange={txt("openaiApiKey")}
                  placeholder={form.openaiApiKeySet ? "Đã có khoá • nhập để thay" : "sk-..."} />
              </Field>
              <Field label="Model" hint="VD: gpt-4o-mini (rẻ nhất), gpt-4o, gpt-4-turbo">
                <input type="text" maxLength={80} className="qp-input"
                  value={form.openaiModel} onChange={txt("openaiModel")}
                  placeholder="gpt-4o-mini" />
              </Field>
            </Card>

            <Card title="Tùy chỉnh (KiraAI, Ollama…)" desc="Bất kỳ API nào tương thích định dạng OpenAI Chat Completions.">
              <Field label="Endpoint URL" hint="URL gốc. VD: https://api.kiraai.vn/v1 — hệ thống tự thêm /chat/completions.">
                <input type="url" maxLength={300} className="qp-input"
                  value={form.customAiEndpoint} onChange={txt("customAiEndpoint")}
                  placeholder="https://api.kiraai.vn/v1" />
              </Field>
              <Field label="API key" hint="Để trống = giữ khoá cũ.">
                {form.customAiKeySet && <span className="qp-acc-badge is-active" style={{ marginBottom: 8, display: "inline-flex" }}>🔑 Đã lưu khoá</span>}
                <input type="password" autoComplete="off" maxLength={200} className="qp-input"
                  value={form.customAiKey} onChange={txt("customAiKey")}
                  placeholder={form.customAiKeySet ? "Đã có khoá • nhập để thay" : "Dán API key tại đây…"} />
              </Field>
              <Field label="Tên model" hint="Tên model mà endpoint yêu cầu. VD: Kira-Mini-0.1">
                <input type="text" maxLength={80} className="qp-input"
                  value={form.customAiModel} onChange={txt("customAiModel")}
                  placeholder="Kira-Mini-0.1" />
              </Field>
            </Card>
          </>
        )}

        {tab === "data" && (
          <Card title="Nạp dữ liệu mẫu" desc="Nạp dữ liệu mẫu cho Dịch vụ công (Trường học · Y tế · Giao thông · Chợ) và Khám phá (Di tích · Đơn vị hành chính · Tổng quan). CHỈ nạp vào mục đang TRỐNG — KHÔNG ghi đè dữ liệu hiện có. Dùng 1 lần sau khi deploy lên cơ sở dữ liệu mới.">
            <button type="button" className="qp-btn-primary" disabled={seeding} onClick={seedDemo}>
              {seeding ? "Đang nạp…" : "Nạp dữ liệu mẫu"}
            </button>
          </Card>
        )}
      </div>
    </form>
  );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="qp-chart-card">
      <div className="qp-set-section__title">{title}</div>
      {desc ? <p className="qp-set-section__desc">{desc}</p> : <div style={{ height: 12 }} />}
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="qp-form-group">
      <label className="qp-label">{label}</label>
      {children}
      {hint && <span className="type-body-small text-muted">{hint}</span>}
    </div>
  );
}
