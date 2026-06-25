// Điều hướng + ticker — 1 nguồn sự thật cho TopBar / Footer / Marquee.

export type NavItem = { id: string; label: string; href: string; desc?: string; icon?: string };
export type NavNode = { id: string; label: string; href?: string; children?: NavItem[] };

// Danh sách phẳng — dùng cho Footer & dò active.
export const NAV: NavItem[] = [
  { id: "index", label: "Trang chủ", href: "/" },
  { id: "tong-quan", label: "Tổng quan", href: "/tong-quan" },
  { id: "truong-hoc", label: "Trường học", href: "/truong-hoc" },
  { id: "y-te", label: "Y tế", href: "/y-te" },
  { id: "viec-lam", label: "Việc làm", href: "/viec-lam" },
  { id: "tim-do-roi", label: "Tìm đồ rơi", href: "/tim-do-roi" },
  { id: "mua-ban", label: "Mua bán", href: "/mua-ban" },
  { id: "cho", label: "Chợ", href: "/cho" },
  { id: "giao-thong", label: "Giao thông", href: "/giao-thong" },
  { id: "di-tich", label: "Di tích", href: "/di-tich" },
  { id: "sap-nhap", label: "Sáp nhập xã 2025", href: "/sap-nhap" },
  { id: "tin-tuc", label: "Tin tức", href: "/tin-tuc" },
  { id: "noi-quy", label: "Nội quy", href: "/noi-quy" },
  { id: "lien-he", label: "Liên hệ", href: "/lien-he" },
];

// Cây menu — dùng cho TopBar (mục cấp 1 + dropdown sổ xuống).
export const NAV_TREE: NavNode[] = [
  { id: "index", label: "Trang chủ", href: "/" },
  {
    id: "dich-vu-cong",
    label: "Tra cứu",
    children: [
      { id: "truong-hoc", label: "Trường học", href: "/truong-hoc", desc: "Trường học theo xã & cấp học", icon: "school" },
      { id: "y-te", label: "Y tế", href: "/y-te", desc: "Bệnh viện, trạm y tế, phòng khám", icon: "health" },
      { id: "giao-thong", label: "Giao thông", href: "/giao-thong", desc: "Tuyến xe, lộ trình, bến đón", icon: "bus" },
      { id: "cho", label: "Chợ", href: "/cho", desc: "Chợ phiên & đặc sản địa phương", icon: "market" },
    ],
  },
  {
    id: "tien-ich",
    label: "Tiện ích",
    children: [
      { id: "viec-lam", label: "Việc làm", href: "/viec-lam", desc: "Tin tuyển dụng địa phương", icon: "job" },
      { id: "tim-do-roi", label: "Tìm đồ rơi", href: "/tim-do-roi", desc: "Đăng & tra tin nhặt được / bị mất", icon: "search" },
      { id: "mua-ban", label: "Mua bán", href: "/mua-ban", desc: "Rao vặt mua bán của người dân", icon: "tag" },
    ],
  },
  {
    id: "kham-pha",
    label: "Khám phá",
    children: [
      { id: "tong-quan", label: "Tổng quan", href: "/tong-quan", desc: "Địa lý, dân số, hành chính", icon: "info" },
      { id: "sap-nhap", label: "Sáp nhập xã 2025", href: "/sap-nhap", desc: "35 xã cũ → 9 xã mới (Hưng Yên)", icon: "map" },
      { id: "di-tich", label: "Di tích", href: "/di-tich", desc: "Đình, chùa, đền & di tích lịch sử", icon: "landmark" },
    ],
  },
  { id: "tin-tuc", label: "Tin tức", href: "/tin-tuc" },
  { id: "noi-quy", label: "Nội quy", href: "/noi-quy" },
  { id: "lien-he", label: "Liên hệ", href: "/lien-he" },
];

export const BRAND = {
  mark: "QP",
  logo: "/img/patterns/logo.png",
  name: "Quỳnh Phụ Tôi",
  sub: "Thông tin · Việc làm · Cộng đồng",
};
