import type { Row } from "@/lib/store";

function isNewRowId(id: string | number | undefined): boolean {
  if (id === undefined || id === null || id === "") return true;
  const s = String(id);
  if (s.includes("-") && !/^\d+-\d+/.test(s)) return true;
  const n = Number(id);
  return !Number.isFinite(n) || n <= 0;
}

const DATE_ENTITY_FIELDS = new Set([
  "createdon",
  "updatedon",
  "goLive",
  "joinDate",
  "birthday",
  "anniversary",
  "lastVisit",
  "date",
  "dueDate",
  "startDate",
  "endDate",
  "fromDate",
  "toDate",
  "payDate",
  "expiry",
  "validityStart",
  "validityEnd",
  "expiresOn",
  "usedOn",
  "createdAt",
]);

function formatDateField(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

function serializeField(key: string, value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (DATE_ENTITY_FIELDS.has(key)) return formatDateField(value);
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** API entity → UI row (CrudPage / store). */
export function toRow<T extends Record<string, unknown>>(entity: T): Row {
  const row: Row = { id: Number(entity.id ?? 0) };
  for (const [key, value] of Object.entries(entity)) {
    if (key === "id") continue;
    row[key] = serializeField(key, value);
  }
  return row;
}

const STRING_AUDIT = new Set(["createdby", "updatedby"]);

function isDateEntityField(key: string): boolean {
  return DATE_ENTITY_FIELDS.has(key);
}

function toApiDate(value: unknown): string | null {
  if (value === "" || value === null || value === undefined) return null;
  const formatted = formatDateField(value);
  return formatted || null;
}
const NUMERIC_ENTITY_FIELDS = new Set([
  "orgId",
  "locationId",
  "membershipId",
  "points",
  "stampsCurrent",
  "totalVisits",
  "walletBalance",
  "royalty",
  "staffId",
  "customerId",
  "serviceId",
  "planId",
  "vendorId",
  "skuId",
  "invoiceId",
  "appointmentId",
  "couponId",
  "campaignId",
  "franchiseId",
  "userId",
  "roleId",
  "shiftId",
  "duration",
  "quantity",
  "qtyIn",
  "qtyOut",
  "validityMonths",
  "includedLimit",
  "extraDiscountPct",
  "retailDiscountPct",
  "price",
  "total",
  "subtotal",
  "tax",
  "discount",
  "lat",
  "lng",
]);

function toApiNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isNumericEntityField(key: string): boolean {
  return NUMERIC_ENTITY_FIELDS.has(key) || /Id$/i.test(key);
}

/** UI row → API entity payload. */
export function rowToEntity<T extends { id?: number }>(row: Row): T {
  const entity: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "id") {
      entity.id = isNewRowId(value as string | number) ? 0 : Number(value);
      continue;
    }
    if (STRING_AUDIT.has(key)) {
      entity[key] = value === null || value === undefined ? "" : String(value);
      continue;
    }
    if (isDateEntityField(key)) {
      entity[key] = toApiDate(value);
      continue;
    }
    if (isNumericEntityField(key)) {
      entity[key] = toApiNumber(value);
      continue;
    }
    entity[key] = value;
  }
  if (!("id" in entity)) entity.id = 0;
  return entity as T;
}

export function parseRowId(id: string | number): number {
  if (isNewRowId(id)) return 0;
  return Number(id);
}
