/** Numeric BIGINT ids from API/seed; compare with sameId() or idStr(). */
export type EntityId = string | number;

export function idStr(v: EntityId | null | undefined): string {
  return v == null || v === "" ? "" : String(v);
}

export function idNum(v: EntityId | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function sameId(a: EntityId | null | undefined, b: EntityId | null | undefined): boolean {
  return idStr(a) === idStr(b);
}
