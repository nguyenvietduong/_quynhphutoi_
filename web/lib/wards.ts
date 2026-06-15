// Danh sách đơn vị hành chính xã Quỳnh Phụ (xã / thị trấn) — dùng cho dropdown
// chọn địa điểm ở form. File client-safe: KHÔNG import MongoDB, chỉ là hằng số.
// name        = nhãn đầy đủ (kèm "Xã"/"Thị trấn"); slug khớp wardSlug trong dữ liệu.
// newCommune  = xã MỚI sau sáp nhập 1/7/2025 (35 đơn vị cũ → 9 xã, thuộc Hưng Yên).

export type Ward = { slug: string; name: string; newCommune: string };

export const WARDS: Ward[] = [
  { slug: "quynh-coi", name: "Thị trấn Quỳnh Côi", newCommune: "Quỳnh Phụ" },
  { slug: "an-bai", name: "Thị trấn An Bài", newCommune: "Phụ Dực" },
  { slug: "an-ap", name: "Xã An Ấp", newCommune: "Đồng Bằng" },
  { slug: "an-cau", name: "Xã An Cầu", newCommune: "Đồng Bằng" },
  { slug: "an-dong", name: "Xã An Đồng", newCommune: "A Sào" },
  { slug: "an-duc", name: "Xã An Dục", newCommune: "Tân Tiến" },
  { slug: "an-hiep", name: "Xã An Hiệp", newCommune: "A Sào" },
  { slug: "an-khe", name: "Xã An Khê", newCommune: "A Sào" },
  { slug: "an-le", name: "Xã An Lễ", newCommune: "Đồng Bằng" },
  { slug: "an-my", name: "Xã An Mỹ", newCommune: "Phụ Dực" },
  { slug: "an-ninh", name: "Xã An Ninh", newCommune: "Phụ Dực" },
  { slug: "an-quy", name: "Xã An Quý", newCommune: "Đồng Bằng" },
  { slug: "an-thai", name: "Xã An Thái", newCommune: "A Sào" },
  { slug: "an-thanh", name: "Xã An Thanh", newCommune: "Phụ Dực" },
  { slug: "an-trang", name: "Xã An Tràng", newCommune: "Tân Tiến" },
  { slug: "an-vinh", name: "Xã An Vinh", newCommune: "Quỳnh An" },
  { slug: "an-vu", name: "Xã An Vũ", newCommune: "Phụ Dực" },
  { slug: "dong-hai", name: "Xã Đông Hải", newCommune: "Quỳnh An" },
  { slug: "dong-tien", name: "Xã Đồng Tiến", newCommune: "Tân Tiến" },
  { slug: "quynh-giao", name: "Xã Quỳnh Giao", newCommune: "Minh Thọ" },
  { slug: "quynh-hai", name: "Xã Quỳnh Hải", newCommune: "Quỳnh Phụ" },
  { slug: "quynh-hoa", name: "Xã Quỳnh Hoa", newCommune: "Minh Thọ" },
  { slug: "quynh-hoang", name: "Xã Quỳnh Hoàng", newCommune: "Ngọc Lâm" },
  { slug: "quynh-hoi", name: "Xã Quỳnh Hội", newCommune: "Quỳnh Phụ" },
  { slug: "quynh-hong", name: "Xã Quỳnh Hồng", newCommune: "Quỳnh Phụ" },
  { slug: "quynh-hung", name: "Xã Quỳnh Hưng", newCommune: "Quỳnh Phụ" },
  { slug: "quynh-khe", name: "Xã Quỳnh Khê", newCommune: "Nguyễn Du" },
  { slug: "quynh-lam", name: "Xã Quỳnh Lâm", newCommune: "Ngọc Lâm" },
  { slug: "quynh-minh", name: "Xã Quỳnh Minh", newCommune: "Minh Thọ" },
  { slug: "quynh-my", name: "Xã Quỳnh Mỹ", newCommune: "Quỳnh Phụ" },
  { slug: "quynh-ngoc", name: "Xã Quỳnh Ngọc", newCommune: "Ngọc Lâm" },
  { slug: "quynh-nguyen", name: "Xã Quỳnh Nguyên", newCommune: "Nguyễn Du" },
  { slug: "quynh-tho", name: "Xã Quỳnh Thọ", newCommune: "Minh Thọ" },
  { slug: "chau-son", name: "Xã Châu Sơn", newCommune: "Nguyễn Du" },
  { slug: "trang-bao-xa", name: "Xã Trang Bảo Xá", newCommune: "Quỳnh An" },
];
