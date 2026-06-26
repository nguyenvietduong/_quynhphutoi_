// Seed bài viết tin tức — nội dung thật, đầy đủ như bài báo (sapo, thân bài nhiều
// khối, tác giả, ảnh bìa, thẻ, SEO). Idempotent: upsert theo slug, chạy lại không
// nhân đôi.
//
// Cách chạy (trong web/):  npm run seed:articles
// hoặc:  node --experimental-strip-types --env-file=.env.local seeds/articles.ts

import { MongoClient } from "mongodb";
import type { ArticleDoc, ArticleBlock } from "../lib/articles"; // chỉ lấy kiểu — bị xoá khi chạy

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "quynhphu";

const IMG = {
  pillars: "/img/patterns/light-pillars.png",
  mesh: "/img/patterns/network-mesh.png",
  waves: "/img/patterns/flow-waves.png",
  slider: "/img/patterns/slider-default.png",
};

// Ước lượng phút đọc từ nội dung (~200 từ/phút).
function mins(body: ArticleBlock[]) {
  const words = body.reduce((s, b) => {
    if (b.type === "list") return s + b.items.join(" ").split(/\s+/).length;
    if ("text" in b && b.text) return s + b.text.split(/\s+/).length;
    return s;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}

type SeedArticle = Omit<ArticleDoc, "_id" | "readingMinutes" | "createdAt" | "updatedAt">;

const ARTICLES: SeedArticle[] = [
  {
    slug: "lich-tuyen-dung-lao-dong-quy-iii-2026",
    title: "Huyện Quỳnh Phụ công bố lịch tuyển dụng lao động quý III/2026",
    excerpt:
      "Hơn 1.000 vị trí tại các cụm công nghiệp Quỳnh Côi, An Bài và doanh nghiệp địa phương sẽ được tuyển dụng trong quý III, tập trung vào lao động phổ thông và kỹ thuật.",
    category: "Thông báo",
    categorySlug: "thong-bao",
    tags: ["Việc làm", "Tuyển dụng", "Cụm công nghiệp"],
    coverImage: IMG.pillars,
    coverAlt: "Công nhân tại cụm công nghiệp Quỳnh Côi",
    author: { name: "Văn phòng UBND huyện", title: "Phòng Lao động – Thương binh & Xã hội" },
    featured: true,
    status: "published",
    views: 3120,
    publishedAt: new Date("2026-06-10T08:00:00+07:00"),
    body: [
      { type: "p", text: "Nhằm kết nối cung – cầu lao động và hỗ trợ doanh nghiệp phục hồi sản xuất, UBND huyện Quỳnh Phụ vừa ban hành kế hoạch tuyển dụng lao động quý III/2026 với hơn 1.000 vị trí trên địa bàn." },
      { type: "h2", text: "Nhu cầu tuyển dụng tập trung ở đâu?" },
      { type: "p", text: "Phần lớn chỉ tiêu đến từ các doanh nghiệp may mặc, điện tử và chế biến nông sản tại cụm công nghiệp Quỳnh Côi và An Bài. Bên cạnh đó là nhu cầu lao động thời vụ phục vụ mùa thu hoạch." },
      { type: "list", items: [
        "May công nghiệp: khoảng 600 vị trí",
        "Lắp ráp linh kiện điện tử: khoảng 250 vị trí",
        "Chế biến, đóng gói nông sản: khoảng 150 vị trí",
        "Kỹ thuật, vận hành máy: khoảng 50 vị trí",
      ] },
      { type: "h2", text: "Người lao động cần chuẩn bị gì?" },
      { type: "p", text: "Ứng viên mang theo căn cước công dân, sơ yếu lý lịch và các chứng chỉ nghề (nếu có). Doanh nghiệp ưu tiên lao động địa phương và có chính sách hỗ trợ đào tạo tại chỗ cho người chưa có tay nghề." },
      { type: "quote", text: "Mục tiêu của huyện là không để lao động phải đi xa tìm việc khi ngay tại quê hương đã có cơ hội ổn định.", cite: "Đại diện Phòng LĐ-TB&XH" },
      { type: "p", text: "Lịch phỏng vấn cụ thể từng doanh nghiệp sẽ được niêm yết tại trụ sở UBND các xã, thị trấn và cập nhật trên Trang cộng đồng Quỳnh Phụ." },
    ],
    seo: {
      metaTitle: "Lịch tuyển dụng lao động quý III/2026 tại Quỳnh Phụ — hơn 1.000 vị trí",
      metaDescription: "Danh sách vị trí, ngành nghề và hồ sơ cần chuẩn bị cho đợt tuyển dụng lao động quý III/2026 tại các cụm công nghiệp huyện Quỳnh Phụ.",
      keywords: ["tuyển dụng Quỳnh Phụ", "việc làm Thái Bình", "cụm công nghiệp Quỳnh Côi", "tuyển lao động 2026"],
      ogType: "article",
    },
  },
  {
    slug: "huong-dan-dang-ky-tam-tru-truc-tuyen",
    title: "Hướng dẫn thủ tục đăng ký tạm trú trực tuyến cho người dân",
    excerpt:
      "Chỉ với điện thoại hoặc máy tính có kết nối Internet, người dân có thể hoàn tất đăng ký tạm trú qua Cổng dịch vụ công mà không cần đến trụ sở công an.",
    category: "Đời sống",
    categorySlug: "doi-song",
    tags: ["Thủ tục", "Dịch vụ công", "Cư trú"],
    coverImage: IMG.mesh,
    coverAlt: "Người dân thao tác dịch vụ công trực tuyến trên điện thoại",
    author: { name: "Công an huyện Quỳnh Phụ", title: "Đội Quản lý hành chính về trật tự xã hội" },
    featured: false,
    status: "published",
    views: 2480,
    publishedAt: new Date("2026-06-09T09:30:00+07:00"),
    body: [
      { type: "p", text: "Đăng ký tạm trú trực tuyến giúp người dân tiết kiệm thời gian đi lại và theo dõi tiến độ hồ sơ mọi lúc. Dưới đây là các bước thực hiện trên Cổng dịch vụ công." },
      { type: "h2", text: "Các bước thực hiện" },
      { type: "list", ordered: true, items: [
        "Đăng nhập Cổng dịch vụ công bằng tài khoản định danh điện tử (VNeID).",
        "Chọn thủ tục “Đăng ký tạm trú” và điền thông tin nơi ở hiện tại.",
        "Tải lên giấy tờ chứng minh chỗ ở hợp pháp (hợp đồng thuê, văn bản đồng ý của chủ nhà…).",
        "Gửi hồ sơ và nhận mã tra cứu để theo dõi kết quả.",
      ] },
      { type: "h2", text: "Thời gian giải quyết" },
      { type: "p", text: "Hồ sơ hợp lệ được xử lý trong vòng 3 ngày làm việc. Trường hợp cần bổ sung, cơ quan công an sẽ thông báo qua tin nhắn hoặc tài khoản dịch vụ công của người dân." },
      { type: "quote", text: "Người dân nên chuẩn bị bản chụp giấy tờ rõ nét trước khi nộp để tránh phải bổ sung nhiều lần." },
    ],
    seo: {
      metaTitle: "Cách đăng ký tạm trú trực tuyến tại Quỳnh Phụ (2026)",
      metaDescription: "Hướng dẫn từng bước đăng ký tạm trú qua Cổng dịch vụ công bằng VNeID, giấy tờ cần thiết và thời gian giải quyết hồ sơ.",
      keywords: ["đăng ký tạm trú online", "dịch vụ công Quỳnh Phụ", "VNeID tạm trú", "thủ tục cư trú"],
    },
  },
  {
    slug: "gia-lua-rau-mau-cho-dau-moi-tuan",
    title: "Mùa vụ mới: giá lúa và rau màu tại các chợ đầu mối trong tuần",
    excerpt:
      "Giá thu mua lúa nhích nhẹ trong khi rau màu giữ mức ổn định tại chợ Quỳnh Côi, chợ Đọ và An Bài — tín hiệu tích cực cho bà con đầu vụ.",
    category: "Kinh tế",
    categorySlug: "kinh-te",
    tags: ["Nông nghiệp", "Giá cả", "Chợ đầu mối"],
    coverImage: IMG.waves,
    coverAlt: "Sạp rau màu tại chợ đầu mối",
    author: { name: "Cộng tác viên thị trường", title: "Trang cộng đồng Quỳnh Phụ" },
    featured: false,
    status: "published",
    views: 1760,
    publishedAt: new Date("2026-06-08T07:15:00+07:00"),
    body: [
      { type: "p", text: "Khảo sát tại ba chợ đầu mối lớn của huyện cho thấy mặt bằng giá nông sản tuần này tương đối ổn định, một số mặt hàng tăng nhẹ do nhu cầu thu mua phục vụ chế biến." },
      { type: "h2", text: "Giá một số mặt hàng chính" },
      { type: "list", items: [
        "Lúa tươi: 7.200 – 7.600 đồng/kg, tăng khoảng 200 đồng so với tuần trước.",
        "Rau cải các loại: 8.000 – 12.000 đồng/kg, ổn định.",
        "Cà chua: 14.000 – 16.000 đồng/kg.",
        "Khoai tây: 13.000 đồng/kg.",
      ] },
      { type: "p", text: "Theo các thương lái, sức mua tăng nhẹ nhờ nhu cầu từ các bếp ăn công nghiệp tại cụm công nghiệp Quỳnh Côi. Bà con được khuyến nghị theo dõi giá hằng ngày để cân đối thời điểm bán." },
      { type: "quote", text: "Giá đầu vụ giữ ổn định là điều kiện tốt để bà con yên tâm chăm sóc và mở rộng diện tích." },
    ],
    seo: {
      metaTitle: "Giá lúa, rau màu tại chợ đầu mối Quỳnh Phụ tuần này",
      metaDescription: "Cập nhật giá thu mua lúa và rau màu tại chợ Quỳnh Côi, chợ Đọ, An Bài — biến động và khuyến nghị cho bà con nông dân.",
      keywords: ["giá nông sản Quỳnh Phụ", "giá lúa Thái Bình", "chợ đầu mối", "giá rau màu"],
    },
  },
  {
    slug: "ke-hoach-tuyen-sinh-lop-10-nam-hoc-moi",
    title: "Kế hoạch tuyển sinh lớp 10 năm học mới của các trường THPT",
    excerpt:
      "Chỉ tiêu, lịch thi và phương thức xét tuyển vào lớp 10 các trường THPT trên địa bàn huyện Quỳnh Phụ đã được Phòng GD&ĐT công bố.",
    category: "Giáo dục",
    categorySlug: "giao-duc",
    tags: ["Tuyển sinh", "THPT", "Giáo dục"],
    coverImage: IMG.slider,
    coverAlt: "Học sinh trong kỳ thi tuyển sinh",
    author: { name: "Phòng Giáo dục & Đào tạo", title: "Huyện Quỳnh Phụ" },
    featured: false,
    status: "published",
    views: 2050,
    publishedAt: new Date("2026-06-06T10:00:00+07:00"),
    body: [
      { type: "p", text: "Phòng GD&ĐT huyện đã ban hành kế hoạch tuyển sinh lớp 10 năm học mới, trong đó nêu rõ chỉ tiêu từng trường và phương thức xét tuyển kết hợp thi tuyển." },
      { type: "h2", text: "Phương thức tuyển sinh" },
      { type: "p", text: "Các trường THPT công lập tổ chức thi ba môn Toán, Ngữ văn và Tiếng Anh. Điểm xét tuyển là tổng điểm ba môn cộng điểm ưu tiên theo quy định." },
      { type: "h3", text: "Lịch thi dự kiến" },
      { type: "list", ordered: true, items: [
        "Ngày 1: môn Ngữ văn (buổi sáng), Tiếng Anh (buổi chiều).",
        "Ngày 2: môn Toán (buổi sáng).",
        "Công bố điểm và danh sách trúng tuyển sau 10 ngày.",
      ] },
      { type: "p", text: "Phụ huynh và học sinh theo dõi thông báo chính thức tại trường THCS đang theo học để nộp hồ sơ đúng thời hạn." },
    ],
    seo: {
      metaTitle: "Tuyển sinh lớp 10 Quỳnh Phụ năm học mới: chỉ tiêu & lịch thi",
      metaDescription: "Phương thức xét tuyển, lịch thi ba môn và mốc thời gian công bố kết quả tuyển sinh lớp 10 các trường THPT huyện Quỳnh Phụ.",
      keywords: ["tuyển sinh lớp 10", "THPT Quỳnh Phụ", "lịch thi vào 10", "giáo dục Thái Bình"],
    },
  },
  {
    slug: "chuan-bi-le-hoi-den-a-sao",
    title: "Chuẩn bị lễ hội truyền thống đền A Sào năm 2026",
    excerpt:
      "Công tác chuẩn bị cho lễ hội đền A Sào — di tích gắn với Hưng Đạo Đại Vương Trần Quốc Tuấn — đang được các đơn vị khẩn trương hoàn tất.",
    category: "Đời sống",
    categorySlug: "doi-song",
    tags: ["Lễ hội", "Di tích", "Văn hoá"],
    coverImage: IMG.mesh,
    coverAlt: "Khu di tích đền A Sào",
    author: { name: "Trung tâm Văn hoá – Thể thao", title: "Huyện Quỳnh Phụ" },
    featured: false,
    status: "published",
    views: 1390,
    publishedAt: new Date("2026-06-02T08:45:00+07:00"),
    body: [
      { type: "p", text: "Đền A Sào là di tích lịch sử – văn hoá tiêu biểu của huyện, gắn với truyền thuyết và công lao của Hưng Đạo Đại Vương Trần Quốc Tuấn. Lễ hội năm nay dự kiến thu hút đông đảo nhân dân và du khách." },
      { type: "h2", text: "Các hoạt động chính" },
      { type: "list", items: [
        "Lễ dâng hương và rước kiệu truyền thống.",
        "Trưng bày hình ảnh, hiện vật về thân thế, sự nghiệp Trần Hưng Đạo.",
        "Các trò chơi dân gian và biểu diễn nghệ thuật.",
      ] },
      { type: "p", text: "Ban tổ chức đã rà soát công tác an ninh, vệ sinh môi trường và phân luồng giao thông để bảo đảm lễ hội diễn ra an toàn, trang trọng." },
      { type: "quote", text: "Gìn giữ lễ hội cũng là gìn giữ niềm tự hào và đạo lý uống nước nhớ nguồn của quê hương." },
    ],
    seo: {
      metaTitle: "Lễ hội đền A Sào 2026 — lịch trình và các hoạt động",
      metaDescription: "Thông tin chuẩn bị lễ hội truyền thống đền A Sào tại Quỳnh Phụ: lễ rước, dâng hương, trò chơi dân gian và công tác tổ chức.",
      keywords: ["lễ hội đền A Sào", "di tích Quỳnh Phụ", "Trần Hưng Đạo", "văn hoá Thái Bình"],
    },
  },
  // ── 3 bài SEO giới thiệu trang web ──────────────────────────────────────
  {
    slug: "gioi-thieu-trang-cong-dong-quynh-phu",
    title: "Trang cộng đồng Quỳnh Phụ là gì? Tính năng, dịch vụ và cách sử dụng",
    excerpt:
      "Trang cộng đồng Quỳnh Phụ là nền tảng thông tin địa phương miễn phí, kết nối người dân huyện Quỳnh Phụ với tin tức, việc làm, mua bán, tìm đồ rơi và nhiều dịch vụ thiết thực khác.",
    category: "Giới thiệu",
    categorySlug: "gioi-thieu",
    tags: ["Trang cộng đồng", "Quỳnh Phụ", "Thái Bình", "Tin tức địa phương"],
    coverImage: IMG.slider,
    coverAlt: "Trang cộng đồng Quỳnh Phụ — kết nối người dân địa phương",
    author: { name: "Ban biên tập", title: "Trang cộng đồng Quỳnh Phụ" },
    featured: true,
    status: "published",
    views: 4200,
    publishedAt: new Date("2026-06-15T08:00:00+07:00"),
    body: [
      { type: "p", text: "Trang cộng đồng Quỳnh Phụ (quynhphutoi.vn) là nền tảng thông tin địa phương do nhóm tình nguyện viên yêu quê hương xây dựng và vận hành. Mục tiêu của trang là trở thành 'điểm đến số' cho mọi người dân huyện Quỳnh Phụ, tỉnh Thái Bình — nơi cập nhật tin tức nhanh nhất, tìm kiếm việc làm dễ dàng nhất và kết nối cộng đồng hiệu quả nhất." },
      { type: "h2", text: "Trang cộng đồng Quỳnh Phụ có những gì?" },
      { type: "p", text: "Không giống một trang báo thông thường, Trang cộng đồng Quỳnh Phụ tích hợp nhiều tính năng thực tế giúp người dân giải quyết nhu cầu hằng ngày ngay trên một nền tảng duy nhất." },
      { type: "list", items: [
        "Tin tức địa phương: thông báo từ UBND huyện, sự kiện văn hoá – xã hội, y tế, giáo dục và an ninh trật tự.",
        "Việc làm: doanh nghiệp đăng tuyển dụng miễn phí, người lao động tìm kiếm công việc phù hợp trong huyện.",
        "Mua bán – rao vặt: sàn giao dịch nhỏ lẻ phi lợi nhuận, kết nối người mua và người bán trong cộng đồng.",
        "Tìm đồ rơi: chuyên mục đặc biệt giúp người dân thông báo và tìm lại tài sản thất lạc.",
        "Tài khoản cá nhân: đăng nhập để theo dõi bài đăng, nhận thông báo và tương tác với cộng đồng.",
      ] },
      { type: "h2", text: "Tại sao nên sử dụng Trang cộng đồng Quỳnh Phụ?" },
      { type: "p", text: "Huyện Quỳnh Phụ có hơn 260.000 người dân sinh sống rải rác trên 38 xã, thị trấn. Từ trước đến nay, việc tiếp cận thông tin địa phương còn nhiều khó khăn — người dân phải tìm kiếm qua nhiều kênh khác nhau, thông tin dễ bị trễ hoặc thiếu chính xác. Trang cộng đồng Quỳnh Phụ ra đời để giải quyết đúng vấn đề đó." },
      { type: "list", items: [
        "Hoàn toàn miễn phí — không quảng cáo xâm lấn, không yêu cầu trả phí đăng tin.",
        "Thông tin kiểm duyệt — mọi bài đăng đều qua đội ngũ biên tập trước khi xuất bản.",
        "Giao diện thân thiện — tối ưu cho cả điện thoại lẫn máy tính.",
        "Bảo mật tài khoản — đăng nhập qua Google, Microsoft hoặc tài khoản riêng.",
      ] },
      { type: "h2", text: "Cách tạo tài khoản và bắt đầu sử dụng" },
      { type: "p", text: "Đăng ký tài khoản chỉ mất dưới 1 phút. Truy cập quynhphutoi.vn, chọn 'Đăng ký', điền tên, email và mật khẩu — hoặc đăng nhập nhanh qua Google. Sau khi có tài khoản, bạn có thể đăng tin tuyển dụng, rao vặt, báo cáo đồ rơi và theo dõi bài đăng của mình mọi lúc, mọi nơi." },
      { type: "h2", text: "Đối tượng phục vụ" },
      { type: "p", text: "Trang phục vụ tất cả người dân có liên quan đến huyện Quỳnh Phụ: người sống và làm việc tại địa phương, người con xa quê muốn cập nhật tin tức quê hương, doanh nghiệp và hộ kinh doanh tại huyện, cũng như du khách tìm hiểu về vùng đất lúa Quỳnh Phụ." },
      { type: "quote", text: "Chúng tôi xây dựng trang này vì tin rằng mỗi người dân đều xứng đáng có một nơi để kết nối với cộng đồng của mình.", cite: "Ban biên tập" },
    ],
    seo: {
      metaTitle: "Trang cộng đồng Quỳnh Phụ — Tin tức, việc làm, mua bán & rao vặt miễn phí",
      metaDescription: "Trang cộng đồng Quỳnh Phụ (quynhphutoi.vn): nền tảng thông tin địa phương miễn phí với tin tức, việc làm, mua bán, tìm đồ rơi cho người dân huyện Quỳnh Phụ, Thái Bình.",
      keywords: ["trang cộng đồng Quỳnh Phụ", "quynhphutoi", "thông tin Quỳnh Phụ", "tin tức Thái Bình", "việc làm Quỳnh Phụ"],
      ogType: "article",
    },
  },
  {
    slug: "tim-viec-lam-tai-quynh-phu",
    title: "Tìm việc làm tại huyện Quỳnh Phụ — Kết nối người lao động và doanh nghiệp địa phương",
    excerpt:
      "Hàng trăm vị trí tuyển dụng tại các doanh nghiệp, cụm công nghiệp và hộ kinh doanh trên địa bàn huyện Quỳnh Phụ được đăng miễn phí mỗi ngày — giúp người lao động không cần đi xa tìm việc.",
    category: "Việc làm",
    categorySlug: "viec-lam",
    tags: ["Việc làm", "Tuyển dụng", "Lao động địa phương", "Quỳnh Phụ"],
    coverImage: IMG.pillars,
    coverAlt: "Người lao động Quỳnh Phụ đang làm việc tại cụm công nghiệp",
    author: { name: "Ban biên tập", title: "Trang cộng đồng Quỳnh Phụ" },
    featured: false,
    status: "published",
    views: 3580,
    publishedAt: new Date("2026-06-14T09:00:00+07:00"),
    body: [
      { type: "p", text: "Mỗi năm, hàng nghìn người lao động tại huyện Quỳnh Phụ phải rời quê lên thành phố tìm việc do thiếu thông tin về cơ hội ngay tại địa phương. Chuyên mục Việc làm trên Trang cộng đồng Quỳnh Phụ ra đời để thu hẹp khoảng cách đó — kết nối trực tiếp giữa người tìm việc và doanh nghiệp cần tuyển dụng trong huyện." },
      { type: "h2", text: "Doanh nghiệp đăng tuyển dụng như thế nào?" },
      { type: "p", text: "Quy trình đăng tin tuyển dụng chỉ gồm 3 bước đơn giản và hoàn toàn miễn phí:" },
      { type: "list", ordered: true, items: [
        "Tạo tài khoản miễn phí tại quynhphutoi.vn (hoặc đăng nhập bằng Google).",
        "Chọn 'Đăng tin việc làm', điền thông tin vị trí, mức lương, yêu cầu và thông tin liên hệ.",
        "Gửi bài — đội ngũ biên tập kiểm duyệt và đăng trong vòng 24 giờ.",
      ] },
      { type: "p", text: "Tin tuyển dụng được hiển thị trên trang chủ, chuyên mục Việc làm và xuất hiện trong kết quả tìm kiếm của Google theo từ khóa địa phương, giúp tăng khả năng tiếp cận ứng viên tiềm năng." },
      { type: "h2", text: "Người lao động tìm việc ở đâu?" },
      { type: "p", text: "Truy cập mục Việc làm tại quynhphutoi.vn/viec-lam để xem tất cả tin tuyển dụng mới nhất. Bạn có thể lọc theo ngành nghề, mức lương hoặc địa điểm làm việc trong huyện. Mỗi tin đăng ghi rõ tên doanh nghiệp, địa chỉ, số điện thoại liên hệ và yêu cầu cụ thể — không qua trung gian." },
      { type: "h2", text: "Các ngành nghề đang có nhiều tuyển dụng tại Quỳnh Phụ" },
      { type: "list", items: [
        "May công nghiệp và dệt may tại các cụm công nghiệp Quỳnh Côi, An Bài.",
        "Lắp ráp linh kiện điện tử, cơ khí.",
        "Chế biến nông sản, thủy hải sản.",
        "Lao động thời vụ: thu hoạch, đóng gói, vận chuyển.",
        "Bán hàng, nhân viên thu ngân, phục vụ.",
        "Xây dựng, sửa chữa nhà dân.",
      ] },
      { type: "h2", text: "Tại sao chọn kênh tuyển dụng địa phương?" },
      { type: "p", text: "Người lao động Quỳnh Phụ khi làm việc tại quê hương được ở gần gia đình, tiết kiệm chi phí thuê nhà và đi lại, đồng thời đóng góp vào sự phát triển kinh tế địa phương. Doanh nghiệp địa phương cũng hưởng lợi từ lực lượng lao động ổn định, gắn bó và hiểu văn hoá địa phương hơn." },
      { type: "quote", text: "Không cần đi đâu xa — cơ hội việc làm tốt đang ở ngay trong huyện, bạn chỉ cần biết tìm đúng chỗ.", cite: "Ban biên tập" },
      { type: "p", text: "Nếu bạn là lao động đang tìm việc hoặc doanh nghiệp đang cần tuyển — hãy ghé thăm quynhphutoi.vn ngay hôm nay." },
    ],
    seo: {
      metaTitle: "Tìm việc làm tại Quỳnh Phụ, Thái Bình — Tuyển dụng miễn phí 2026",
      metaDescription: "Kênh tuyển dụng miễn phí tại huyện Quỳnh Phụ, Thái Bình. Hàng trăm tin việc làm tại cụm công nghiệp, doanh nghiệp và hộ kinh doanh địa phương cập nhật hằng ngày.",
      keywords: ["việc làm Quỳnh Phụ", "tuyển dụng Quỳnh Phụ", "tìm việc Thái Bình", "tuyển dụng lao động địa phương", "cụm công nghiệp Quỳnh Côi"],
      ogType: "article",
    },
  },
  {
    slug: "mua-ban-rao-vat-quynh-phu",
    title: "Mua bán, rao vặt tại Quỳnh Phụ — Sàn giao dịch miễn phí cho cộng đồng",
    excerpt:
      "Đăng tin rao vặt, mua bán đồ cũ hoặc trao đổi hàng hoá trong cộng đồng huyện Quỳnh Phụ hoàn toàn miễn phí — nhanh, đơn giản và an toàn hơn các kênh mạng xã hội thông thường.",
    category: "Mua bán",
    categorySlug: "mua-ban",
    tags: ["Mua bán", "Rao vặt", "Đồ cũ", "Quỳnh Phụ", "Chợ online"],
    coverImage: IMG.waves,
    coverAlt: "Chợ phiên truyền thống tại huyện Quỳnh Phụ",
    author: { name: "Ban biên tập", title: "Trang cộng đồng Quỳnh Phụ" },
    featured: false,
    status: "published",
    views: 2910,
    publishedAt: new Date("2026-06-13T10:30:00+07:00"),
    body: [
      { type: "p", text: "Chuyên mục Mua bán trên Trang cộng đồng Quỳnh Phụ là nơi người dân trong huyện đăng tin bán đồ dùng không cần thiết, tìm kiếm hàng hoá cần mua, hoặc trao đổi sản phẩm với nhau — tất cả miễn phí, không qua trung gian, không hoa hồng." },
      { type: "h2", text: "Đăng tin rao vặt như thế nào?" },
      { type: "p", text: "Việc đăng tin rất đơn giản, chỉ cần tài khoản miễn phí trên quynhphutoi.vn:" },
      { type: "list", ordered: true, items: [
        "Đăng nhập tài khoản (hoặc đăng ký nhanh bằng Google).",
        "Chọn 'Đăng tin mua bán', chọn danh mục phù hợp.",
        "Điền tiêu đề, mô tả chi tiết, giá cả và thông tin liên hệ.",
        "Tải ảnh sản phẩm (tối đa 5 ảnh) để tăng tỷ lệ giao dịch thành công.",
        "Gửi bài — biên tập viên kiểm duyệt và đăng trong 24 giờ.",
      ] },
      { type: "h2", text: "Có thể mua bán những gì?" },
      { type: "p", text: "Sàn mua bán Quỳnh Phụ không giới hạn danh mục, miễn là hàng hoá hợp pháp và phục vụ nhu cầu thiết thực của người dân địa phương:" },
      { type: "list", items: [
        "Điện tử, điện lạnh, thiết bị gia dụng cũ.",
        "Xe máy, xe đạp, phụ tùng.",
        "Nội thất, đồ dùng gia đình.",
        "Quần áo, giày dép, phụ kiện.",
        "Nông cụ, máy nông nghiệp.",
        "Thực phẩm, nông sản tươi từ vườn nhà.",
        "Dịch vụ tại nhà: sửa điện, sửa nước, dạy học...",
      ] },
      { type: "h2", text: "Lợi ích so với đăng trên mạng xã hội" },
      { type: "p", text: "Nhiều người dân đang đăng rao vặt trong các hội nhóm Facebook địa phương, nhưng thường bị cuốn trôi bởi hàng trăm bài đăng mỗi ngày. Trang cộng đồng Quỳnh Phụ khác biệt ở chỗ:" },
      { type: "list", items: [
        "Tin đăng hiển thị theo danh mục — người mua tìm đúng thứ mình cần, không bị lạc trong 'mớ hỗn độn'.",
        "Tìm kiếm nội bộ — gõ từ khoá là ra ngay tin liên quan.",
        "Kiểm duyệt nội dung — lọc bỏ tin rác, hàng giả, lừa đảo.",
        "Hiển thị trên Google — tin đăng có thể xuất hiện trong kết quả tìm kiếm, mở rộng khả năng tiếp cận.",
      ] },
      { type: "h2", text: "Mẹo bán hàng nhanh" },
      { type: "list", items: [
        "Chụp ảnh rõ nét, đủ góc độ — ảnh mờ làm người mua mất tin tưởng.",
        "Ghi rõ tình trạng sản phẩm: mới, 90%, 80%... và lý do bán.",
        "Đặt giá thực tế — so sánh với giá thị trường hiện tại.",
        "Ghi số điện thoại liên hệ để người mua trao đổi nhanh hơn.",
        "Cập nhật bài đăng nếu hàng còn hoặc đã bán để tránh gây nhầm.",
      ] },
      { type: "quote", text: "Mỗi món đồ không dùng đến của bạn đều có thể là thứ người khác đang cần — chia sẻ để cộng đồng cùng được lợi.", cite: "Ban biên tập" },
    ],
    seo: {
      metaTitle: "Mua bán, rao vặt miễn phí tại Quỳnh Phụ — Chợ online cộng đồng 2026",
      metaDescription: "Đăng tin rao vặt, mua bán đồ cũ tại huyện Quỳnh Phụ, Thái Bình hoàn toàn miễn phí. Xe máy, điện tử, nội thất, nông sản — tìm kiếm và giao dịch an toàn ngay trong cộng đồng.",
      keywords: ["mua bán Quỳnh Phụ", "rao vặt Quỳnh Phụ", "chợ online Thái Bình", "đồ cũ Quỳnh Phụ", "mua bán địa phương"],
      ogType: "article",
    },
  },
  {
    slug: "thong-bao-lich-tam-ngung-cap-dien-bao-duong",
    title: "Thông báo lịch tạm ngừng cấp điện để bảo dưỡng lưới điện",
    excerpt:
      "Điện lực Quỳnh Phụ thông báo lịch tạm ngừng cấp điện phục vụ bảo dưỡng định kỳ tại một số xã, đề nghị người dân chủ động sắp xếp sinh hoạt và sản xuất.",
    category: "Thông báo",
    categorySlug: "thong-bao",
    tags: ["Điện lực", "Thông báo", "Bảo dưỡng"],
    coverImage: IMG.pillars,
    coverAlt: "Công nhân điện lực bảo dưỡng đường dây",
    author: { name: "Điện lực Quỳnh Phụ", title: "Công ty Điện lực Thái Bình" },
    featured: false,
    status: "published",
    views: 980,
    publishedAt: new Date("2026-05-30T16:20:00+07:00"),
    body: [
      { type: "p", text: "Để nâng cao độ tin cậy cung cấp điện trong cao điểm mùa hè, Điện lực Quỳnh Phụ thực hiện bảo dưỡng định kỳ lưới điện và tạm ngừng cấp điện theo lịch dưới đây." },
      { type: "list", ordered: true, items: [
        "Thị trấn Quỳnh Côi: 6h00 – 11h00.",
        "Xã An Bài: 7h30 – 12h00.",
        "Xã Quỳnh Hải: 13h30 – 17h00.",
      ] },
      { type: "p", text: "Đơn vị mong nhận được sự thông cảm của khách hàng. Trường hợp thời tiết bất lợi, lịch có thể thay đổi và sẽ được thông báo lại." },
      { type: "quote", text: "Khách hàng cần hỗ trợ vui lòng liên hệ tổng đài chăm sóc khách hàng ngành điện để được giải đáp." },
    ],
    seo: {
      metaTitle: "Lịch cắt điện bảo dưỡng tại Quỳnh Phụ — cập nhật mới nhất",
      metaDescription: "Lịch tạm ngừng cấp điện để bảo dưỡng lưới điện tại thị trấn Quỳnh Côi và các xã, thời gian cụ thể từng khu vực.",
      keywords: ["lịch cắt điện Quỳnh Phụ", "điện lực Thái Bình", "bảo dưỡng lưới điện", "thông báo cắt điện"],
    },
  },
];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const col = client.db(dbName).collection<ArticleDoc>("articles");
    await col.createIndex({ slug: 1 }, { unique: true });
    await col.createIndex({ status: 1, publishedAt: -1 });
    await col.createIndex({ categorySlug: 1, publishedAt: -1 });
    await col.createIndex({ featured: 1, publishedAt: -1 });
    await col.createIndex({ title: "text", excerpt: "text", tags: "text" }, { default_language: "none" });

    for (const a of ARTICLES) {
      const now = new Date();
      await col.updateOne(
        { slug: a.slug },
        {
          $set: { ...a, readingMinutes: mins(a.body), updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
      console.log(`✓ ${a.category.padEnd(10)} ${a.slug}  (${mins(a.body)} phút đọc)`);
    }
    console.log(`\n✅ Đã seed ${ARTICLES.length} bài viết vào "${dbName}".`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("❌ Seed thất bại:", err);
  // eslint-disable-next-line no-undef
  process.exit(1);
});
