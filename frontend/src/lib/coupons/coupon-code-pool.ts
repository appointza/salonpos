import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import type { CouponRule } from "@/lib/coupons/coupon-schema";
import { VOUCHERS } from "@/lib/vouchers/voucher-service";

export type CouponCodeStatus = "Available" | "Issued" | "Used" | "Expired" | "Cancelled";

export type CouponPoolCode = {
  id: string;
  code: string;
  status: CouponCodeStatus;
  poolIndex: number;
  customerId: EntityId;
  customerName: string;
  customerPhone: string;
  issuedAt: string;
  redeemedAt: string;
  invoiceId: EntityId;
  discountAmount: number;
  locationId: EntityId;
  locationName: string;
};

export type CouponPoolStats = {
  total: number;
  used: number;
  unused: number;
  available: number;
  issued: number;
  expired: number;
  cancelled: number;
  remaining: number;
};

function str(row: Row, key: string, fallback = "") {
  return String(row[key] ?? fallback);
}

export function couponQuantity(coupon: Row) {
  const qty = Number(coupon["couponQuantity"] ?? coupon["totalUsageLimit"] ?? 0);
  return Math.max(0, Math.floor(qty));
}

export function buildPoolCode(coupon: Row, sequenceIndex: number) {
  const prefix = str(coupon, "codePrefix", str(coupon, "code", "CPN"))
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase() || "CPN";
  const suffix = str(coupon, "codeSuffix").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const start = Math.max(1, Math.floor(Number(coupon["codeStartNumber"] ?? 1)));
  const length = Math.max(3, Math.floor(Number(coupon["codeLength"] ?? 4)));
  const num = start + sequenceIndex - 1;
  const core = `${prefix}${String(num).padStart(length, "0")}`;
  return suffix ? `${core}-${suffix}` : core;
}

export function previewPoolCodes(coupon: Row, count = 3) {
  const limit = Math.min(count, couponQuantity(coupon));
  return Array.from({ length: limit }, (_, i) => buildPoolCode(coupon, i + 1));
}

function isSchemeExpired(coupon: CouponRule | Row, at = new Date()) {
  const end = str(coupon, "validityEnd");
  if (!end) return false;
  return end < at.toISOString().slice(0, 10);
}

export function resolvePoolCodeStatus(voucher: Row, scheme?: CouponRule | Row): CouponCodeStatus {
  if (str(voucher, "status") === "Cancelled") return "Cancelled";
  if (str(voucher, "status") === "Redeemed" || str(voucher, "billId") || str(voucher, "invoiceId")) return "Used";
  const customerId = str(voucher, "issueTo") || str(voucher, "customerId");
  if (scheme && isSchemeExpired(scheme) && str(voucher, "poolGenerated") === "Yes") return "Expired";
  if (customerId) return "Issued";
  return "Available";
}

export function poolCodesForCoupon(db: Db, couponId: EntityId): Row[] {
  return (db[VOUCHERS] ?? []).filter((v) => str(v, "couponId") === couponId);
}

export function shouldGenerateCodePool(coupon: Row) {
  if (String(coupon["autoGenerateCodes"] ?? "Yes") === "No") return false;
  return couponQuantity(coupon) > 0;
}

export function hasCodePoolConfigured(coupon: Row) {
  return shouldGenerateCodePool(coupon);
}

export function couponPoolStats(db: Db, couponId: EntityId, scheme?: CouponRule | Row): CouponPoolStats {
  const rows = poolCodesForCoupon(db, couponId);
  const expected = scheme ? couponQuantity(scheme as Row) : rows.length;
  let used = 0;
  let available = 0;
  let issued = 0;
  let expired = 0;
  let cancelled = 0;

  for (const v of rows) {
    const status = resolvePoolCodeStatus(v, scheme);
    if (status === "Used") used += 1;
    else if (status === "Available") available += 1;
    else if (status === "Issued") issued += 1;
    else if (status === "Expired") expired += 1;
    else if (status === "Cancelled") cancelled += 1;
  }

  const total = Math.max(expected, rows.length);
  const unused = available + issued;
  const remaining = available;

  return { total, used, unused, available, issued, expired, cancelled, remaining };
}

export function listCouponPoolCodes(
  db: Db,
  couponId: EntityId,
  scheme?: CouponRule | Row,
  locations?: { locationId: EntityId; name: string }[],
): CouponPoolCode[] {
  const customers = db["customers"] ?? [];
  const customerById = new Map(customers.map((c) => [String(c.id), c]));
  const locName = (id: string) => locations?.find((l) => l.locationId === id)?.name ?? id;

  return poolCodesForCoupon(db, couponId)
    .map((v) => {
      const customerId = str(v, "issueTo") || str(v, "customerId");
      const customer = customerId ? customerById.get(customerId) : undefined;
      const status = resolvePoolCodeStatus(v, scheme);
      const locId = str(v, "redeemedLocationId", str(v, "locationId"));
      return {
        id: String(v.id),
        code: str(v, "code"),
        status,
        poolIndex: Number(v["poolIndex"] ?? 0),
        customerId,
        customerName: customer ? str(customer, "name", "Guest") : "—",
        customerPhone: customer ? str(customer, "phone") : "",
        issuedAt: str(v, "issuedAt"),
        redeemedAt: str(v, "redeemedAt"),
        invoiceId: str(v, "invoiceId") || str(v, "billId"),
        discountAmount: Number(v["discountAmount"] ?? 0),
        locationId: locId,
        locationName: locId ? locName(locId) : "—",
      };
    })
    .sort((a, b) => a.poolIndex - b.poolIndex || a.code.localeCompare(b.code));
}

export function syncCouponCodePool(
  store: { db: Db; create: (collection: string, row: Row) => void },
  coupon: Row,
): { generated: number; total: number } {
  if (!shouldGenerateCodePool(coupon)) return { generated: 0, total: 0 };

  const couponId = String(coupon.id);
  const limit = couponQuantity(coupon);
  if (!limit) return { generated: 0, total: 0 };

  const orgId = String(coupon["orgId"] ?? "");
  const locationId = String(coupon["locationId"] ?? "");
  const today = new Date().toISOString().slice(0, 10);

  const existing = poolCodesForCoupon(store.db, couponId);
  const byIndex = new Map<number, Row>();
  const usedCodes = new Set<string>();

  for (const row of store.db[VOUCHERS] ?? []) {
    usedCodes.add(str(row, "code").toLowerCase());
  }

  for (const v of existing) {
    const idx = Number(v["poolIndex"] ?? 0);
    if (idx > 0) byIndex.set(idx, v);
  }

  let generated = 0;

  for (let i = 1; i <= limit; i++) {
    if (byIndex.has(i)) continue;

    let code = buildPoolCode(coupon, i);
    let attempt = 0;
    while (usedCodes.has(code.toLowerCase()) && attempt < 8) {
      code = `${buildPoolCode(coupon, i)}${attempt + 1}`;
      attempt += 1;
    }
    if (usedCodes.has(code.toLowerCase())) continue;

    const voucher: Row = {
      id: `V-${couponId.replace(/[^A-Za-z0-9]/g, "").slice(-8)}-${String(i).padStart(4, "0")}`,
      orgId,
      locationId,
      couponId,
      code,
      voucherType: "Coupon",
      amount: 0,
      issueTo: "",
      customerId: "",
      billId: "",
      invoiceId: "",
      status: "Available",
      unlimited: "No",
      issuedAt: today,
      redeemedAt: "",
      schemeCode: str(coupon, "codePrefix", str(coupon, "code")),
      schemeTitle: String(coupon["title"] ?? ""),
      poolIndex: i,
      poolGenerated: "Yes",
    };

    store.create(VOUCHERS, voucher);
    usedCodes.add(code.toLowerCase());
    generated += 1;
  }

  return { generated, total: limit };
}

export function couponHasCodePool(db: Db, couponId: EntityId) {
  return poolCodesForCoupon(db, couponId).some((v) => str(v, "poolGenerated") === "Yes");
}

export function isMasterSchemeCodeRedeemable(db: Db, coupon: Row) {
  if (!shouldGenerateCodePool(coupon)) return true;
  return !couponHasCodePool(db, String(coupon.id));
}

export function discountTypeLabel(type: string) {
  if (type === "percentage") return "Percentage";
  if (type === "fixed_amount") return "Flat Amount";
  if (type === "slab_based") return "Slab-Based";
  if (type === "flat_price") return "Flat Price";
  if (type === "buy_x_get_y") return "Buy X Get Y";
  if (type === "free_service") return "Free Service";
  if (type === "free_addon") return "Free Add-on";
  return type.replace(/_/g, " ");
}
