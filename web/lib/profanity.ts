// Bộ lọc từ ngữ thô tục / xúc phạm — dùng chung cho tin đăng (Mua bán · Việc làm ·
// Tìm đồ rơi) và bình luận. Danh sách từ cấm lưu ở DB (collection profanity_words),
// admin quản lý qua trang /admin/loc-tu-ngu.
//
// Bắt được cả cách viết lách phổ biến…
//   - bỏ dấu:        "dit me"      ← "địt mẹ"   (cần bật "khớp cả không dấu")
//   - chèn ký tự:    "l.ồ.n"
//   - lặp ký tự:     "lồnnnn"
//   - leet:          "đm4y", "l0n"
// …nhưng HẠN CHẾ nhầm với từ tiếng Việt bình thường. Vì bỏ dấu gây va chạm nặng
// (các ↔ cặc, lớn/lon ↔ lồn, đủ ↔ đụ…), mỗi từ có cờ "accentInsensitive": tắt =
// chỉ khớp khi CÒN DẤU (an toàn cho từ đơn dễ nhầm); bật = khớp cả khi bỏ dấu
// (dùng cho viết tắt & cụm dài ít nguy cơ nhầm).
import { getDb, ensureIndexes } from "@/lib/db";
import { ObjectId } from "mongodb";

// --- Chuẩn hoá -------------------------------------------------------------

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "9": "g",
  "@": "a", "$": "s", "+": "t",
};

// thường hoá + đổi leet → chữ, GIỮ nguyên dấu tiếng Việt.
function normalize(s: string): string {
  return s.toLowerCase().replace(/[0134579@$+]/g, (c) => LEET[c] ?? c);
}
// bỏ dấu thanh + dấu mũ, đ → d.
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}
// bỏ mọi ký tự không phải chữ/số (gộp "đ ị t" → "địt", "l.ồ.n" → "lồn").
function squish(s: string): string {
  return s.replace(/[^\p{L}\p{N}]+/gu, "");
}
// gộp ký tự lặp liên tiếp về 1 ("lồnnnn" → "lồn").
function dedup(s: string): string {
  return s.replace(/(.)\1+/gu, "$1");
}
function tokenize(s: string): string[] {
  return s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// --- Bộ so khớp (thuần hàm) ------------------------------------------------

export type ProfanityEntry = { text: string; accentInsensitive: boolean };

type Compiled =
  | { label: string; kind: "phrase"; vi: string; ascii?: string }
  | { label: string; kind: "word"; vi: string; viDedup: string; ascii?: string };

function compile(e: ProfanityEntry): Compiled | null {
  const norm = normalize(e.text).trim();
  if (!norm) return null;
  if (/\s/.test(norm)) {
    const rawVi = squish(norm);
    if (rawVi.length < 4) return null; // cụm quá ngắn → dễ trùng, bỏ
    let ascii: string | undefined;
    if (e.accentInsensitive) {
      const rawA = stripDiacritics(rawVi);
      if (rawA.length >= 5) ascii = dedup(rawA);
    }
    return { label: e.text.trim(), kind: "phrase", vi: dedup(rawVi), ascii };
  }
  return {
    label: e.text.trim(), kind: "word",
    vi: norm, viDedup: dedup(norm),
    ascii: e.accentInsensitive ? stripDiacritics(norm) : undefined,
  };
}

// Tìm các từ/cụm thô tục trong văn bản. Trả về danh sách nhãn đã khớp (rỗng = sạch).
export function scanProfanity(input: string, entries: ProfanityEntry[]): string[] {
  if (!input || entries.length === 0) return [];
  const norm = normalize(input.slice(0, 8000));
  const tokens = tokenize(norm);

  const tokSet = new Set<string>();
  for (const t of tokens) { tokSet.add(t); tokSet.add(dedup(t)); }
  const tokAscii = new Set<string>([...tokSet].map(stripDiacritics));

  const squVi = dedup(squish(norm));
  const squAscii = dedup(stripDiacritics(squVi));

  const hits = new Set<string>();
  for (const e of entries) {
    const c = compile(e);
    if (!c) continue;
    if (c.kind === "phrase") {
      if (squVi.includes(c.vi)) hits.add(c.label);
      else if (c.ascii && squAscii.includes(c.ascii)) hits.add(c.label);
    } else {
      if (tokSet.has(c.vi) || tokSet.has(c.viDedup)) hits.add(c.label);
      else if (c.ascii && tokAscii.has(c.ascii)) hits.add(c.label);
    }
  }
  return [...hits];
}

// --- Danh sách mặc định (seed lần đầu) -------------------------------------

const DEFAULT_WORDS: ProfanityEntry[] = [
  // Từ thô tục đơn — chỉ khớp khi CÒN DẤU (tránh nhầm: các, lớn, đủ, đi, đĩa…).
  ...["lồn", "cặc", "buồi", "đụ", "địt", "đĩ", "cứt", "loz", "lốz"].map((text) => ({ text, accentInsensitive: false })),
  // Viết tắt / dạng ascii không nhầm với từ thường — khớp cả khi bỏ dấu.
  ...["dm", "đm", "dmm", "đmm", "đml", "dml", "vl", "vcl", "vclm", "vkl", "vcc",
    "dkm", "đkm", "dcm", "đcm", "clm", "cml", "cmm", "đmay", "dmay", "đcmm", "dcmm"]
    .map((text) => ({ text, accentInsensitive: true })),
  // Cụm — khớp cả khi bỏ dấu (đủ dài, ít nguy cơ nhầm).
  ...["địt mẹ", "địt con mẹ", "địt cụ", "đụ má", "đụ mẹ", "vãi lồn", "vãi cả lồn",
    "vãi cứt", "con đĩ", "đĩ điếm", "con mẹ mày", "óc chó", "óc lợn", "súc vật",
    "súc sinh", "đầu buồi", "ngậm cặc", "ăn cứt", "khốn nạn", "mất dạy", "đồ khốn",
    "thằng khốn", "con khốn", "đồ điếm", "con điếm"].map((text) => ({ text, accentInsensitive: true })),
  // Cụm dễ nhầm khi bỏ dấu (chó đẻ ↔ cho dễ…) — chỉ khớp khi còn dấu.
  ...["đĩ mẹ", "thằng chó", "đồ chó", "chó đẻ", "đồ chó đẻ", "mả cha", "mả mẹ"]
    .map((text) => ({ text, accentInsensitive: false })),
];

// --- Lưu trữ DB ------------------------------------------------------------

export type ProfanityWordDoc = {
  _id?: ObjectId;
  text: string;
  accentInsensitive: boolean;
  enabled: boolean;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProfanityRow = {
  id: string;
  text: string;
  accentInsensitive: boolean;
  enabled: boolean;
  note: string;
  createdAt: string;
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function profanityCol() {
  const db = await getDb();
  const col = db.collection<ProfanityWordDoc>("profanity_words");
  await ensureIndexes("profanity_words", () => Promise.all([
    col.createIndex({ enabled: 1 }),
    col.createIndex({ updatedAt: -1 }),
  ]));
  return col;
}

export function toProfanityRow(d: ProfanityWordDoc): ProfanityRow {
  return {
    id: d._id!.toString(),
    text: d.text,
    accentInsensitive: d.accentInsensitive,
    enabled: d.enabled,
    note: d.note ?? "",
    createdAt: d.createdAt.toISOString(),
  };
}

// Bộ nhớ đệm danh sách đang bật (giảm truy vấn — gọi ở mọi lượt đăng tin/bình luận).
let cache: { at: number; words: ProfanityEntry[] } | null = null;
const CACHE_TTL = 60_000;

export function invalidateProfanityCache() { cache = null; }

// Danh sách từ cấm đang bật — tự seed mặc định nếu collection còn trống.
export async function getActiveProfanityWords(): Promise<ProfanityEntry[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL) return cache.words;
  const col = await profanityCol();
  let docs = await col.find({ enabled: true }).toArray();
  if (docs.length === 0 && (await col.countDocuments()) === 0) {
    await seedProfanityWords();
    docs = await col.find({ enabled: true }).toArray();
  }
  const words = docs.map((d) => ({ text: d.text, accentInsensitive: d.accentInsensitive }));
  cache = { at: now, words };
  return words;
}

// Nạp danh sách mặc định — chỉ thêm từ nào CHƯA có (không ghi đè chỉnh sửa của admin).
export async function seedProfanityWords(): Promise<number> {
  const col = await profanityCol();
  const existing = new Set(
    (await col.find({}, { projection: { text: 1 } }).toArray()).map((d) => d.text.toLowerCase()),
  );
  const now = new Date();
  const toAdd = DEFAULT_WORDS
    .filter((w) => !existing.has(w.text.toLowerCase()))
    .map((w) => ({ text: w.text, accentInsensitive: w.accentInsensitive, enabled: true, createdAt: now, updatedAt: now }));
  if (toAdd.length) await col.insertMany(toAdd);
  invalidateProfanityCache();
  return toAdd.length;
}

export async function listProfanityWords(): Promise<ProfanityWordDoc[]> {
  const col = await profanityCol();
  return col.find({}).sort({ updatedAt: -1 }).toArray();
}

export async function addProfanityWord(input: { text: string; accentInsensitive?: boolean; enabled?: boolean; note?: string }) {
  const text = String(input.text ?? "").trim();
  if (!text) throw new Error("Vui lòng nhập từ/cụm cần lọc.");
  if (text.length > 80) throw new Error("Từ/cụm quá dài (tối đa 80 ký tự).");
  const col = await profanityCol();
  const dup = await col.findOne({ text: { $regex: `^${escapeRegex(text)}$`, $options: "i" } });
  if (dup) throw new Error("Từ/cụm này đã có trong danh sách.");
  const now = new Date();
  const doc: ProfanityWordDoc = {
    text,
    accentInsensitive: !!input.accentInsensitive,
    enabled: input.enabled !== false,
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await col.insertOne(doc);
  invalidateProfanityCache();
  return { ...doc, _id: insertedId };
}

// Tách danh sách từ dán vào (ngăn bởi dấu phẩy / xuống dòng / chấm phẩy).
export function splitWordList(raw: string): string[] {
  return raw.split(/[\n,;]+/).map((w) => w.trim()).filter(Boolean);
}

// Thêm nhiều từ một lúc — bỏ qua từ rỗng / quá dài / trùng (cả trùng trong DB lẫn trong batch).
export async function addProfanityWords(texts: string[], accentInsensitive = false) {
  const col = await profanityCol();
  const existing = new Set(
    (await col.find({}, { projection: { text: 1 } }).toArray()).map((d) => d.text.toLowerCase()),
  );
  const now = new Date();
  const seen = new Set<string>();
  const docs: ProfanityWordDoc[] = [];
  for (const raw of texts) {
    const text = String(raw ?? "").trim();
    if (!text || text.length > 80) continue;
    const key = text.toLowerCase();
    if (existing.has(key) || seen.has(key)) continue;
    seen.add(key);
    docs.push({ text, accentInsensitive, enabled: true, createdAt: now, updatedAt: now });
  }
  if (docs.length === 0) return [];
  const res = await col.insertMany(docs);
  invalidateProfanityCache();
  return docs.map((d, i) => ({ ...d, _id: res.insertedIds[i] }));
}

// Gom từ điển tục từ thư viện ngoài (leo-profanity + bad-words — chủ yếu tiếng Anh).
// Dynamic import để KHÔNG nạp từ điển vào đường nóng (route đăng tin/bình luận).
async function collectLibraryWords(): Promise<string[]> {
  const set = new Set<string>();
  // chỉ nhận từ "sạch": chữ/số ascii, có thể kèm khoảng/gạch/nháy, dài 3–80.
  const ok = (w: unknown) => {
    const t = String(w ?? "").trim().toLowerCase();
    return t.length >= 3 && t.length <= 80 && /^[a-z0-9][a-z0-9 '-]*$/.test(t);
  };
  try {
    const bw = await import("bad-words");
    const Filter = (bw as { Filter?: new () => { list: string[] }; default?: unknown }).Filter
      ?? (bw as { default?: { Filter?: new () => { list: string[] } } }).default?.Filter
      ?? (bw as { default?: new () => { list: string[] } }).default;
    if (Filter) for (const w of new (Filter as new () => { list: string[] })().list) if (ok(w)) set.add(String(w).trim().toLowerCase());
  } catch { /* thiếu package → bỏ qua */ }
  try {
    const leoMod = await import("leo-profanity");
    const leo = (leoMod.default ?? leoMod) as unknown as { getDictionary: (l: string) => string[] };
    for (const w of leo.getDictionary("en")) if (ok(w)) set.add(String(w).trim().toLowerCase());
  } catch { /* thiếu package → bỏ qua */ }
  return [...set];
}

// Nạp từ điển thư viện vào DB (chỉ thêm từ chưa có). accentInsensitive=false để
// tránh từ tiếng Anh ngắn "đè" lên từ tiếng Việt có dấu.
export async function importLibraryWords(): Promise<{ added: number; scanned: number }> {
  const words = await collectLibraryWords();
  const added = await addProfanityWords(words, false);
  return { added: added.length, scanned: words.length };
}

export type ProfanityPatch = Partial<{ text: string; accentInsensitive: boolean; enabled: boolean; note: string }>;

export async function updateProfanityWord(id: string, patch: ProfanityPatch): Promise<number> {
  if (!ObjectId.isValid(id)) return 0;
  const col = await profanityCol();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof patch.text === "string") {
    const text = patch.text.trim();
    if (!text) throw new Error("Từ/cụm không được để trống.");
    if (text.length > 80) throw new Error("Từ/cụm quá dài (tối đa 80 ký tự).");
    const dup = await col.findOne({ _id: { $ne: new ObjectId(id) }, text: { $regex: `^${escapeRegex(text)}$`, $options: "i" } });
    if (dup) throw new Error("Từ/cụm này đã có trong danh sách.");
    set.text = text;
  }
  if (typeof patch.accentInsensitive === "boolean") set.accentInsensitive = patch.accentInsensitive;
  if (typeof patch.enabled === "boolean") set.enabled = patch.enabled;
  if (typeof patch.note === "string") set.note = patch.note.trim() || undefined;
  const res = await col.updateOne({ _id: new ObjectId(id) }, { $set: set });
  invalidateProfanityCache();
  return res.matchedCount;
}

export async function deleteProfanityWord(id: string): Promise<number> {
  if (!ObjectId.isValid(id)) return 0;
  const col = await profanityCol();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  invalidateProfanityCache();
  return res.deletedCount;
}
