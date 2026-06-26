// Nội quy / quy định đăng bài — NGUỒN DÙNG CHUNG cho trang /noi-quy, modal đồng ý
// sau đăng nhập, và API lưu xác nhận. Chỉ là hằng số (an toàn cho cả server & client).
//
// Khi sửa nội dung quan trọng → tăng RULES_VERSION để hệ thống hiện lại modal cho
// người dùng đã đồng ý phiên bản cũ (so sánh với user.rulesAgreedVersion).

export const RULES_VERSION = 1;

export const RULES_TITLE = "Quy định đăng bài & nội quy cộng đồng";

export const RULES_INTRO =
  "Để đảm bảo an toàn, chất lượng nội dung và bảo vệ quyền riêng tư của mỗi thành viên, " +
  "những bài đăng có nội dung sau đây sẽ KHÔNG được phê duyệt hiển thị công khai trên Trang cộng đồng Quỳnh Phụ:";

export const RULES_ITEMS: string[] = [
  "Liên quan đến giấy tờ tuỳ thân (CCCD, giấy phép lái xe, đăng ký xe, thẻ BHYT…) gây mất an toàn thông tin cá nhân.",
  "Mua bán, trao đổi động vật và thịt động vật.",
  "Bạo lực, tự tử, chém giết, máu me, hình ảnh ghê rợn, phản cảm.",
  "Kiện tụng, bôi nhọ, bêu xấu cá nhân; xuyên tạc, chống phá Đảng và Nhà nước.",
  "Khoả thân, khiêu dâm, bóc lột trẻ em và người lớn.",
  "Lừa đảo dưới mọi hình thức (việc nhẹ lương cao…).",
  "Thông tin sai sự thật, gây ảnh hưởng xấu và hoang mang dư luận.",
  "Bài đăng không có nội dung rõ ràng, không nêu được mục đích (người đọc không hiểu bài muốn nói gì).",
  "Bài đăng sao chép, chia sẻ lại nội dung từ nơi khác mà không mang giá trị cho cộng đồng.",
  "Quảng cáo, rao vặt tràn lan gây nhiễu nội dung cộng đồng.",
];

export const RULES_NOTE =
  "Mọi bài đăng của thành viên đều được kiểm duyệt trước khi hiển thị công khai. " +
  "Hệ thống cũng tự động che số giấy tờ tuỳ thân nếu phát hiện trong bài viết.";

export const RULES_OUTRO =
  "Trân trọng cảm ơn bà con đồng hương Quỳnh Phụ – Thái Bình đã chung tay xây dựng cộng đồng văn minh, an toàn. " +
  "Chúc tất cả mọi người mỗi ngày là một niềm vui!";

export const RULES_SIGNATURE = "Ban Quản trị — Nguyễn Viết Dương";
