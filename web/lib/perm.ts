// Utility thuần — không import DB. An toàn dùng cả ở client lẫn server.
export type PermLevel = "none" | "view" | "edit" | "full";

const PERM_ORDER: Record<PermLevel, number> = { none: 0, view: 1, edit: 2, full: 3 };

export function hasPerm(actual: PermLevel, required: PermLevel): boolean {
  return PERM_ORDER[actual] >= PERM_ORDER[required];
}
