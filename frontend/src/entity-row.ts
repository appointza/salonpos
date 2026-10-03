import type { Row } from "@/store";

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

/** Look like IDs but the API stores them as strings (Meta IDs, codes, JSON blobs). */
const STRING_ENTITY_FIELDS = new Set([
  "whatsappPhoneNumberId",
  "whatsappBusinessAccountId",
  "whatsappDisplayNumber",
  "whatsappApiKey",
  "whatsappWebhookToken",
  "whatsappApiVersion",
  "whatsappConnected",
  "placeId",
  "bookingRules",
  "serviceDisplaySettings",
  "walkInRewardMode",
  "rewardWheelWeights",
  "rewardScratchWeights",
  "rewardCustomerTierWeights",
  "publicBookingShowPrizeWheel",
  "publicBookingShowScratchCard",
]);

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
  "gstRate",
  "commission",
  "commissionRate",
  "baseSalary",
  "target",
  "total",
  "subtotal",
  "tax",
  "discount",
  "prizeValue",
  "rewardValue",
  "winWeight",
  "lat",
  "lng",
]);

function toApiNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toApiString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isNumericEntityField(key: string): boolean {
  if (STRING_ENTITY_FIELDS.has(key) || STRING_AUDIT.has(key)) return false;
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
    if (STRING_AUDIT.has(key) || STRING_ENTITY_FIELDS.has(key)) {
      entity[key] = toApiString(value);
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
    entity[key] = typeof value === "number" ? value : toApiString(value);
  }
  if (!("id" in entity)) entity.id = 0;
  return entity as T;
}

export function parseRowId(id: string | number): number {
  if (isNewRowId(id)) return 0;
  return Number(id);
}
