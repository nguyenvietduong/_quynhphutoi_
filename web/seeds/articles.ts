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
