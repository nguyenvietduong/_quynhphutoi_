// Migration: chuyển ảnh từ folder gốc (quynhphu/) vào sub-folder theo module.
// POST { dryRun?: boolean } → { migrated, skipped, errors, items }
import { NextResponse } from "next/server";
import { requirePerm } from "@/lib/admin-guard";
import { getDb } from "@/lib/db";
import {
  cloudinaryConfigured, isRootAsset, extractPublicId, migratedPublicId, renameMedia,
  FOLDER,
} from "@/lib/media";

type MigItem = { collection: string; docId: string; field: string; oldUrl: string; newUrl: string };
type ErrItem = { collection: string; docId: string; field: string; url: string; error: string };

// Cấu hình từng collection: module sub-folder + các field có URL ảnh.
const PLAN = [
  { col: "articles",   mod: "tin-tuc",    single: ["coverImage"], array: null as null | string, nested: "seo.ogImage", body: true },
  { col: "schools",    mod: "truong-hoc", single: ["image"],      array: null,                  nested: null,          body: false },
  { col: "health",     mod: "y-te",       single: ["image"],      array: null,                  nested: null,          body: false },
  { col: "market",     mod: "cho",        single: ["image"],      array: null,                  nested: null,          body: false },
  { col: "jobs",       mod: "viec-lam",   single: [],             array: "images",               nested: null,          body: false },
  { col: "lostfound",  mod: "tim-do-roi", single: [],             array: "images",               nested: null,          body: false },
  { col: "classifieds",mod: "mua-ban",    single: [],             array: "images",               nested: null,          body: false },
  { col: "relics",     mod: "di-tich",    single: [],             array: "images",               nested: null,          body: false },
] as const;

export async function POST(req: Request) {
  const g = await requirePerm("media", "full");
  if (g instanceof NextResponse) return g;
  if (!cloudinaryConfigured) return NextResponse.json({ error: "Chưa cấu hình Cloudinary." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const dryRun: boolean = body.dryRun === true;

  const items: MigItem[]  = [];
  const errors: ErrItem[] = [];
  const db = await getDb();

  // Helper: rename 1 URL, trả về URL mới (hoặc null nếu lỗi/không cần migrate).
  async function processUrl(url: string, mod: string, label: string, docId: string, col: string): Promise<string | null> {
    if (!isRootAsset(url)) return null; // đã ở đúng folder → bỏ qua
    const newPid = migratedPublicId(url, mod);
    if (!newPid) return null;
    if (dryRun) {
      items.push({ collection: col, docId, field: label, oldUrl: url, newUrl: `[dryRun] ${FOLDER}/${mod}/...` });
      return url; // giữ nguyên để không cập nhật DB
    }
    try {
      const oldPid = extractPublicId(url)!;
      const newUrl = await renameMedia(oldPid, newPid);
      items.push({ collection: col, docId, field: label, oldUrl: url, newUrl });
      return newUrl;
    } catch (e) {
      errors.push({ collection: col, docId, field: label, url, error: String(e) });
      return null;
    }
  }

  // Xử lý từng collection
  for (const plan of PLAN) {
    const col = db.collection(plan.col);
    // Lấy tất cả doc có ít nhất 1 field ảnh (không lọc sâu ở DB để đơn giản)
    const docs = await col.find({}).toArray();

    for (const doc of docs) {
      const id = String(doc._id);
      const $set: Record<string, unknown> = {};

      // Single fields (string)
      for (const field of plan.single) {
        const url = doc[field as keyof typeof doc] as string | undefined;
        if (!url || typeof url !== "string") continue;
        const newUrl = await processUrl(url, plan.mod, field, id, plan.col);
        if (newUrl && newUrl !== url) $set[field] = newUrl;
      }

      // Nested: seo.ogImage (articles only)
      if (plan.nested) {
        const parts = plan.nested.split(".");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let val: any = doc;
        for (const p of parts) val = val?.[p];
        if (typeof val === "string" && val) {
          // nếu ogImage === coverImage đã được đổi, dùng giá trị mới
          const alreadyMapped = $set["coverImage"];
          if (alreadyMapped && val === (doc["coverImage"] as string)) {
            if (!dryRun) $set[plan.nested] = alreadyMapped;
          } else {
            const newUrl = await processUrl(val, plan.mod, plan.nested, id, plan.col);
            if (newUrl && newUrl !== val) $set[plan.nested] = newUrl;
          }
        }
      }

      // Array field (images[])
      if (plan.array) {
        const arr = doc[plan.array as keyof typeof doc] as string[] | undefined;
        if (Array.isArray(arr) && arr.length > 0) {
          const newArr = [...arr];
          let changed = false;
          for (let i = 0; i < newArr.length; i++) {
            const url = newArr[i];
            if (typeof url !== "string") continue;
            const newUrl = await processUrl(url, plan.mod, `${plan.array}[${i}]`, id, plan.col);
            if (newUrl && newUrl !== url) { newArr[i] = newUrl; changed = true; }
          }
          if (changed) $set[plan.array] = newArr;
        }
      }

      // Articles body image blocks
      if (plan.body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = doc["body"] as any[] | undefined;
        if (Array.isArray(body)) {
          const newBody = body.map((b) => ({ ...b }));
          let changed = false;
          for (let i = 0; i < newBody.length; i++) {
            const blk = newBody[i];
            if (blk?.type === "image" && typeof blk.src === "string" && blk.src) {
              const newUrl = await processUrl(blk.src, plan.mod, `body[${i}].src`, id, plan.col);
              if (newUrl && newUrl !== blk.src) { newBody[i].src = newUrl; changed = true; }
            }
          }
          if (changed) $set["body"] = newBody;
        }
      }

      // Cập nhật DB nếu có thay đổi
      if (!dryRun && Object.keys($set).length > 0) {
        await col.updateOne({ _id: doc._id }, { $set });
      }
    }
  }

  // Settings: siteLogo, siteFavicon
  const settingsCol = db.collection("settings");
  const settings = await settingsCol.findOne({ _id: "app" as unknown as import("mongodb").ObjectId });
  if (settings) {
    const sSet: Record<string, unknown> = {};
    for (const field of ["siteLogo", "siteFavicon"] as const) {
      const url = settings[field] as string | undefined;
      if (!url || typeof url !== "string") continue;
      const newUrl = await processUrl(url, "system", field, "app", "settings");
      if (newUrl && newUrl !== url) sSet[field] = newUrl;
    }
    if (!dryRun && Object.keys(sSet).length > 0) {
      await settingsCol.updateOne({ _id: "app" as unknown as import("mongodb").ObjectId }, { $set: sSet });
    }
  }

  return NextResponse.json({
    dryRun,
    migrated: dryRun ? 0 : items.length,
    preview: dryRun ? items.length : undefined,
    errors: errors.length,
    errorDetails: errors,
    items: dryRun ? items : undefined,
  });
}
