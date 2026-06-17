// Kiểu danh mục / tình trạng cho Mua bán — client-safe (KHÔNG import MongoDB).
// Danh mục & tình trạng nay QUẢN LÝ 100% trong admin (collection categories,
// module "mua-ban" và "tinh-trang"). Type mở (string) — đọc nhãn từ DB.
export type ClassifiedCategory = string;
export type ClassifiedCondition = string;
