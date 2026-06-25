// Constants về module sub-folder — dùng được cả client lẫn server.
// Tách khỏi lib/media.ts để tránh kéo Cloudinary SDK vào client bundle.

export const MODULE_SUBFOLDER: Record<string, string> = {
  "tin-tuc":    "tin-tuc",
  "truong-hoc": "truong-hoc",
  "viec-lam":   "viec-lam",
  "tim-do-roi": "tim-do-roi",
  "mua-ban":    "mua-ban",
  "cho":        "cho",
  "y-te":       "y-te",
  "di-tich":    "di-tich",
  "system":     "system",
};

export const MODULE_LABELS: Record<string, string> = {
  "tin-tuc":    "Tin tuc",
  "truong-hoc": "Truong hoc",
  "viec-lam":   "Viec lam",
  "tim-do-roi": "Tim do roi",
  "mua-ban":    "Mua ban",
  "cho":        "Cho & Mua ban",
  "y-te":       "Y te",
  "di-tich":    "Di tich",
  "system":     "He thong",
};
