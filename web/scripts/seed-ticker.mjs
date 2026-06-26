import { MongoClient } from "mongodb";

const URI = "mongodb://duongtindz_db:duongtindz_db@ac-fdbeuyg-shard-00-00.rqyhldh.mongodb.net:27017,ac-fdbeuyg-shard-00-01.rqyhldh.mongodb.net:27017,ac-fdbeuyg-shard-00-02.rqyhldh.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=QuynhPhu";

const client = new MongoClient(URI);
await client.connect();
const db = client.db("quynhphu");

const actor = await db.collection("users").findOne({ email: "duongnv10504@gmail.com" });
if (!actor) { console.log("Không tìm thấy user!"); await client.close(); process.exit(1); }

const text = "Chào mừng đến với Khu vực Quản trị Trang cộng đồng Quỳnh Phụ! Hãy cùng nhau xây dựng cộng đồng tốt đẹp hơn.";
const actorName = actor.name;
const now = new Date();

await db.collection("staff_ticker").insertOne({ text, actorName, createdAt: now });
console.log("✅ Đã thêm vào ticker");

const staff = await db.collection("users").find(
  { role: { $in: ["admin", "editor"] } },
  { projection: { _id: 1 } }
).toArray();

const actorId = actor._id.toString();
const recipients = staff.filter(s => s._id.toString() !== actorId);
if (recipients.length > 0) {
  await db.collection("notifications").insertMany(recipients.map(r => ({
    userId: r._id,
    type: "announcement",
    title: text,
    href: "/thong-bao",
    actorName,
    read: false,
    createdAt: now,
  })));
}

console.log(`✅ Gửi notification cho ${recipients.length} thành viên ban quản trị`);
console.log("Actor:", actorName);
console.log("Nội dung:", text);
await client.close();
