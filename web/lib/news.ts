// Kiểu dữ liệu & tiện ích hiển thị cho tin tức — view-model dùng chung cho NewsCard /
// NewsBrowser. Nội dung THẬT lấy từ DB (lib/articles.ts) rồi map sang `Article` này
// qua toNewsCardArticle. KHÔNG còn dữ liệu mẫu tĩnh (đã bỏ mock NEWS).

// Tên danh mục tin tức — mở (string), quản lý 100% trong admin (module "tin-tuc").
export type NewsCategory = string;

// Phạm vi tin: trong xã (địa phương) hay ngoài xã (tin báo ngoài, nhập từ RSS…).
// Bài cũ/không gắn → coi như "trong-xa".
export type ArticleScope = "trong-xa" | "ngoai-xa";
export const SCOPE_LABEL: Record<ArticleScope, string> = {
  "trong-xa": "Trong xã",
  "ngoai-xa": "Ngoài xã",
};

export type Article = {
  id: string;
  slug: string;
  category: NewsCategory;
  scope: ArticleScope;
  title: string;
  excerpt: string;
  image: string;
  date: string;     // dd/mm/yyyy
  readTime: string;
  author: string;
  tags: string[];
  views: number;    // lượt đọc thật (từ DB)
};

export function fmtViews(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k lượt đọc` : `${n} lượt đọc`;
}

// dd/mm/yyyy -> số yyyymmdd để sắp xếp.
export function dateKey(d: string): number {
  const [dd, mm, yy] = d.split("/");
  return Number(`${yy}${mm}${dd}`);
}
