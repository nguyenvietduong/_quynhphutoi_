// Script tạo tài khoản test có 1 cảnh báo + 1 bài vi phạm để test WarningModal.
// Chạy: node scripts/seed-test-warning.mjs
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const URI = "mongodb://duongtindz_db:duongtindz_db@ac-fdbeuyg-shard-00-00.rqyhldh.mongodb.net:27017,ac-fdbeuyg-shard-00-01.rqyhldh.mongodb.net:27017,ac-fdbeuyg-shard-00-02.rqyhldh.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=QuynhPhu";
const DB  = "quynhphu";

const EMAIL    = "test-canh-bao@test.com";
const PASSWORD = "Test@123456";
const NAME     = "Người dùng test cảnh báo";

const client = new MongoClient(URI);

try {
  await client.connect();
  const db = client.db(DB);

  // 1. Tạo / cập nhật user test
  const users = db.collection("users");
  let user = await users.findOne({ email: EMAIL });
  if (!user) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const res = await users.insertOne({
      email: EMAIL,
      name: NAME,
      passwordHash,
      verified: true,
      role: "user",
      warnCount: 1,
      createdAt: new Date(),
    });
    user = await users.findOne({ _id: res.insertedId });
    console.log("✅ Tạo user mới:", EMAIL);
  } else {
    await users.updateOne({ _id: user._id }, { $set: { warnCount: 1, banned: false } });
    console.log("✅ Cập nhật user hiện có:", EMAIL);
  }

  const userId = user._id.toString();

  // 2. Tạo bài viết test (chờ duyệt, có flag)
  const articles = db.collection("articles");
  const articleTitle = "[TEST] Bài viết vi phạm nội quy — chứa từ cấm";
  const slug = "test-bai-viet-vi-pham-" + Date.now();

  const articleRes = await articles.insertOne({
    slug,
    title: articleTitle,
    excerpt: "Đây là bài viết test để kiểm tra WarningModal.",
    category: "Đời sống",
    categorySlug: "doi-song",
    scope: "trong-xa",
    tags: [],
    coverImage: "",
    author: { name: NAME },
    body: [{ type: "html", html: "<p>Nội dung test vi phạm nội quy.</p>" }],
    readingMinutes: 1,
    views: 0,
    featured: false,
    status: "published",
    approved: false,
    active: true,
    flags: ["Chứa từ ngữ nhạy cảm"],
    postedBy: user._id,
    postedByName: NAME,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const articleId = articleRes.insertedId.toString();
  console.log("✅ Tạo bài viết:", slug);

  // 3. Tạo warning record
  const warnings = db.collection("user_warnings");
  // Xóa warning cũ cho user test (nếu chạy lại nhiều lần)
  await warnings.deleteMany({ userId });
  await warnings.insertOne({
    userId,
    articleId,
    articleTitle,
    articleSlug: slug,
    module: "tin-tuc",
    reason: "Chứa từ ngữ nhạy cảm",
    createdAt: new Date(),
  });
  console.log("✅ Tạo warning record");

  console.log("\n========================================");
  console.log("  TÀI KHOẢN TEST:");
  console.log("  Email   :", EMAIL);
  console.log("  Password:", PASSWORD);
  console.log("  warnCount: 1");
  console.log("  → Đăng nhập rồi vào bất kỳ trang nào để thấy WarningModal");
  console.log("========================================\n");

} finally {
  await client.close();
}
