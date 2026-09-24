import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import { getCustomerById } from "@/lib/customers/customer-lookup";
import { isBirthdayWindow } from "@/lib/qr-loyalty";
import {
  COUPONS_COLLECTION,
  COUPON_REDEMPTIONS,
  type AppliesTo,
  type CouponRule,
  type CustomerSegment,
  type DiscountSlab,
  type DiscountType,
  type UsageLimitMode,
} from "@/lib/coupons/coupon-schema";

export const QR_OFFERS = "qrOffers";
export const QR_OFFER_REDEMPTIONS = "qrOfferRedemptions";

export type CartLine = {
  type: "service" | "product" | "membership" | "booking_fee" | "other";
  id: string;
  category: string;
  name: string;
  qty: number;
  price: number;
};

export type CouponContext = {
  db: Db;
  customer: Row;
  orgId: EntityId;
  locationId: EntityId;
  at?: Date;
  paymentMethod?: string;
  staffId?: string;
  isFirstAppointment?: boolean;
  advanceBookingDays?: number;
  cart?: CartLine[];
};

const LEGACY_TYPE_MAP: Record<string, DiscountType> = {
  "% off": "percentage",
  "Flat off": "fixed_amount",
  "Buy X get free": "buy_x_get_y",
  "Free service": "free_service",
  "Free item": "free_addon",
};

const LEGACY_SEGMENT_MAP: Record<string, CustomerSegment> = {
  All: "all",
  "New customer": "new_customer",
  Birthday: "birthday",
  Gold: "gold",
  Platinum: "platinum",
};

function num(row: Row, key: string, fallback = 0) {
  const v = Number(row[key]);
  return Number.isFinite(v) ? v : fallback;
}

function str(row: Row, key: string, fallback = "") {
  return String(row[key] ?? fallback);
}

function parseList(raw: string) {
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function dayKey(d: Date) {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
}

function todayStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function timeStr(d: Date) {
  return d.toTimeString().slice(0, 5);
}

/** Map legacy qrOffers + new coupons collection into one rule shape. */
export function normalizeCoupon(row: Row, source: "coupons" | "qrOffers" = "coupons"): CouponRule {
  if (source === "qrOffers" || row["offerType"]) {
    const legacyType = str(row, "offerType");
    const discountType = LEGACY_TYPE_MAP[legacyType] ?? "percentage";
    const hay = `${str(row, "title")} ${str(row, "description")}`.toLowerCase();
    let discountValue = num(row, "discountValue");
    if (!discountValue && discountType === "percentage") {
      const m = hay.match(/(\d+)\s*%/);
      discountValue = m ? Number(m[1]) : 10;
    }
    if (!discountValue && discountType === "fixed_amount") {
      const m = hay.match(/₹\s*(\d+)/);
      discountValue = m ? Number(m[1]) : 200;
    }
    return {
      id: str(row, "id"),
      orgId: str(row, "orgId"),
      locationId: str(row, "locationId"),
      code: str(row, "code", str(row, "id")),
      title: str(row, "title") || str(row, "description", "Offer"),
      description: str(row, "description"),
      discountType,
      discountValue,
      maxDiscount: num(row, "maxDiscount"),
      flatPrice: num(row, "flatPrice"),
      buyQty: num(row, "buyQty", 4),
      freeQty: num(row, "freeQty", 1),
      freeItemName: str(row, "serviceName", "service"),
      appliesTo: (str(row, "appliesTo") as AppliesTo) || "entire_bill",
      targetIds: str(row, "targetIds"),
      targetNames: str(row, "targetNames"),
      minBillAmount: num(row, "minBillAmount"),
      minQuantity: num(row, "minQuantity"),
      minBookingValue: num(row, "minBookingValue"),
      customerSegment: LEGACY_SEGMENT_MAP[str(row, "eligibleSegment")] ?? "all",
      targetCustomerId: str(row, "targetCustomerId"),
      discountSlabs: str(row, "discountSlabs"),
      inactiveDays: num(row, "inactiveDays", 90),
      staffId: str(row, "staffId"),
      paymentMethod: str(row, "paymentMethod", "Any"),
      firstAppointmentOnly: str(row, "firstAppointmentOnly", "No"),
      advanceBookingDays: num(row, "advanceBookingDays"),
      validityStart: str(row, "validityStart"),
      validityEnd: str(row, "validityEnd"),
      validDays: str(row, "validDays", "all"),
      validTimeStart: str(row, "validTimeStart"),
      validTimeEnd: str(row, "validTimeEnd"),
      flashEndsAt: str(row, "flashEndsAt"),
      usageLimitMode: (str(row, "usageLimitMode") as UsageLimitMode) || "per_customer",
      totalUsageLimit: num(row, "totalUsageLimit", 100),
      perCustomerLimit: num(row, "perCustomerLimit", 1),
      usageCount: num(row, "usageCount"),
      status: str(row, "status", "Draft"),
      campaignTag: str(row, "campaignTag"),
      codePrefix: str(row, "codePrefix", str(row, "code")),
      codeSuffix: str(row, "codeSuffix"),
      codeStartNumber: num(row, "codeStartNumber", 1),
      codeLength: num(row, "codeLength", 4),
      couponQuantity: num(row, "couponQuantity", num(row, "totalUsageLimit", 0)),
      autoGenerateCodes: str(row, "autoGenerateCodes", "Yes"),
      eligibleLocationIds: str(row, "eligibleLocationIds"),
      allowWithOtherDiscounts: str(row, "allowWithOtherDiscounts", "Yes"),
      allowWithLoyalty: str(row, "allowWithLoyalty", "Yes"),
      source: "qrOffers",
    };
  }

  return {
    id: str(row, "id"),
    orgId: str(row, "orgId"),
    locationId: str(row, "locationId"),
    code: str(row, "code"),
    title: str(row, "title"),
    description: str(row, "description"),
    discountType: (str(row, "discountType") as DiscountType) || "percentage",
    discountValue: num(row, "discountValue"),
    maxDiscount: num(row, "maxDiscount"),
    flatPrice: num(row, "flatPrice"),
    buyQty: num(row, "buyQty", 2),
    freeQty: num(row, "freeQty", 1),
    freeItemName: str(row, "freeItemName", "service"),
    appliesTo: (str(row, "appliesTo") as AppliesTo) || "entire_bill",
    targetIds: str(row, "targetIds"),
    targetNames: str(row, "targetNames"),
    minBillAmount: num(row, "minBillAmount"),
    minQuantity: num(row, "minQuantity"),
    minBookingValue: num(row, "minBookingValue"),
    customerSegment: (str(row, "customerSegment") as CustomerSegment) || "all",
    targetCustomerId: str(row, "targetCustomerId"),
    discountSlabs: str(row, "discountSlabs"),
    inactiveDays: num(row, "inactiveDays", 90),
    staffId: str(row, "staffId"),
    paymentMethod: str(row, "paymentMethod", "Any"),
    firstAppointmentOnly: str(row, "firstAppointmentOnly", "No"),
    advanceBookingDays: num(row, "advanceBookingDays"),
    validityStart: str(row, "validityStart"),
    validityEnd: str(row, "validityEnd"),
    validDays: str(row, "validDays", "all"),
    validTimeStart: str(row, "validTimeStart"),
    validTimeEnd: str(row, "validTimeEnd"),
    flashEndsAt: str(row, "flashEndsAt"),
    usageLimitMode: (str(row, "usageLimitMode") as UsageLimitMode) || "per_customer",
    totalUsageLimit: num(row, "totalUsageLimit", 100),
    perCustomerLimit: num(row, "perCustomerLimit", 1),
    usageCount: num(row, "usageCount"),
    status: str(row, "status", "Draft"),
    campaignTag: str(row, "campaignTag"),
    codePrefix: str(row, "codePrefix", str(row, "code")),
    codeSuffix: str(row, "codeSuffix"),
    codeStartNumber: num(row, "codeStartNumber", 1),
    codeLength: num(row, "codeLength", 4),
    couponQuantity: num(row, "couponQuantity", num(row, "totalUsageLimit", 0)),
    autoGenerateCodes: str(row, "autoGenerateCodes", "Yes"),
    eligibleLocationIds: str(row, "eligibleLocationIds"),
    allowWithOtherDiscounts: str(row, "allowWithOtherDiscounts", "Yes"),
    allowWithLoyalty: str(row, "allowWithLoyalty", "Yes"),
    source: "coupons",
  };
}

export function listCouponDefinitions(db: Db, scope?: { orgId?: EntityId; locationId?: EntityId }) {
  const rows: CouponRule[] = [];
  for (const r of db[COUPONS_COLLECTION] ?? []) {
    if (scope?.orgId && str(r, "orgId") !== scope.orgId) continue;
    if (scope?.locationId && scope.locationId !== "all" && r["locationId"]) {
      if (str(r, "locationId") !== scope.locationId) continue;
    }
    rows.push(normalizeCoupon(r, "coupons"));
  }
  for (const r of db[QR_OFFERS] ?? []) {
    if (scope?.orgId && str(r, "orgId") !== scope.orgId) continue;
    if (scope?.locationId && scope.locationId !== "all" && r["locationId"]) {
      if (str(r, "locationId") !== scope.locationId) continue;
    }
    rows.push(normalizeCoupon(r, "qrOffers"));
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

function isNewCustomer(db: Db, customerId: EntityId) {
  const customer = getCustomerById(db, customerId);
  if (!customer) return false;
  const visits = Number(customer["totalVisits"] ?? customer["visits"] ?? 0);
  const priorCheckins = (db["qrCheckins"] ?? []).filter(
    (c) => String(c["customerId"]) === customerId && String(c["status"]) === "Approved",
  ).length;
  return visits <= 1 && priorCheckins <= 1;
}

function isInactiveCustomer(customer: Row, inactiveDays: number, onDate: string) {
  const last = str(customer, "lastVisit");
  if (!last) return false;
  const diff = (new Date(onDate).getTime() - new Date(last).getTime()) / 86400000;
  return diff >= inactiveDays;
}

function redemptionRows(db: Db, couponId: EntityId) {
  const legacy = (db[QR_OFFER_REDEMPTIONS] ?? []).filter(
    (r) => String(r["couponId"] ?? r["offerId"]) === couponId,
  );
  const modern = (db[COUPON_REDEMPTIONS] ?? []).filter(
    (r) => String(r["couponId"]) === couponId && String(r["status"]) === "Used",
  );
  return [...legacy, ...modern];
}

export function parseDiscountSlabs(raw: string): DiscountSlab[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as DiscountSlab[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => ({
        minBill: Number(s.minBill) || 0,
        maxBill: Number(s.maxBill) || 0,
        discount: Number(s.discount) || 0,
      }))
      .filter((s) => s.minBill >= 0 && s.discount > 0)
      .sort((a, b) => a.minBill - b.minBill);
  } catch {
    return [];
  }
}

export function slabDiscountForBill(slabs: DiscountSlab[], billAmount: number) {
  if (billAmount <= 0 || slabs.length === 0) return 0;
  let best = 0;
  for (const slab of slabs) {
    if (billAmount < slab.minBill) continue;
    if (slab.maxBill > 0 && billAmount > slab.maxBill) continue;
    best = Math.max(best, slab.discount);
  }
  return best;
}

export function findCouponSchemeByCode(db: Db, code: string, orgId?: EntityId) {
  const q = code.trim().replace(/^#/, "").toLowerCase();
  if (!q) return null;
  const row = (db[COUPONS_COLLECTION] ?? []).find((c) => {
    if (orgId && str(c, "orgId") && str(c, "orgId") !== orgId) return false;
    return str(c, "code").replace(/^#/, "").toLowerCase() === q;
  });
  return row ? normalizeCoupon(row, "coupons") : null;
}

function customerRedemptions(db: Db, couponId: EntityId, customerId: EntityId, since?: string) {
  return redemptionRows(db, couponId).filter((r) => {
    if (String(r["customerId"]) !== customerId) return false;
    if (!since) return true;
    const issued = str(r, "issuedAt");
    return issued >= since;
  });
}

function usageBlocked(db: Db, coupon: CouponRule, customerId: EntityId, at: Date): string | null {
  const redeemed = redemptionRows(db, coupon.id);
  const totalUsed = Math.max(coupon.usageCount, redeemed.length);

  if (coupon.usageLimitMode === "single_use" && totalUsed >= 1) return "Coupon already used";
  if (coupon.usageLimitMode === "limited_total" && totalUsed >= coupon.totalUsageLimit) {
    return "Coupon usage limit reached";
  }

  const customerUses = customerRedemptions(db, coupon.id, customerId);
  if (coupon.usageLimitMode === "per_customer" && customerUses.length >= coupon.perCustomerLimit) {
    return "Already used by this customer";
  }
  if (coupon.usageLimitMode === "single_use" && customerUses.some((r) => String(r["status"]) === "Redeemed")) {
    return "Already used by this customer";
  }

  const day = todayStr(at);
  if (coupon.usageLimitMode === "daily") {
    const todayUses = customerUses.filter((r) => str(r, "issuedAt") === day);
    if (todayUses.length >= coupon.perCustomerLimit) return "Daily limit reached";
  }
  if (coupon.usageLimitMode === "weekly") {
    const weekAgo = new Date(at);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const since = todayStr(weekAgo);
    if (customerRedemptions(db, coupon.id, customerId, since).length >= coupon.perCustomerLimit) {
      return "Weekly limit reached";
    }
  }
  if (coupon.usageLimitMode === "monthly") {
    const monthAgo = new Date(at);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const since = todayStr(monthAgo);
    if (customerRedemptions(db, coupon.id, customerId, since).length >= coupon.perCustomerLimit) {
      return "Monthly limit reached";
    }
  }

  return null;
}

function eligibleCartSubtotal(coupon: CouponRule, cart: CartLine[]) {
  const targets = parseList(coupon.targetIds);
  const filtered = cart.filter((line) => {
    if (coupon.appliesTo === "entire_bill") return true;
    if (coupon.appliesTo === "services") return line.type === "service";
    if (coupon.appliesTo === "products") return line.type === "product";
    if (coupon.appliesTo === "membership") return line.type === "membership";
    if (coupon.appliesTo === "booking_fee") return line.type === "booking_fee";
    if (coupon.appliesTo === "categories") {
      return line.type === "service" && (targets.length === 0 || targets.includes(line.category.toLowerCase()));
    }
    if (coupon.appliesTo === "service_product") {
      return line.type === "service" || line.type === "product";
    }
    if (targets.length > 0) {
      return targets.includes(line.id.toLowerCase()) || targets.includes(line.category.toLowerCase());
    }
    return true;
  });
  return filtered.reduce((sum, l) => sum + l.price * l.qty, 0);
}

export function evaluateCouponEligibility(
  coupon: CouponRule,
  ctx: CouponContext,
): { ok: boolean; reason?: string } {
  const at = ctx.at ?? new Date();
  const onDate = todayStr(at);
  const customerId = String(ctx.customer.id);

  if (coupon.status !== "Active") return { ok: false, reason: "Coupon is not active" };
  if (coupon.orgId && coupon.orgId !== ctx.orgId) return { ok: false, reason: "Wrong organisation" };
  if (coupon.locationId && coupon.locationId !== ctx.locationId) {
    return { ok: false, reason: "Not valid at this outlet" };
  }

  if (coupon.validityStart && onDate < coupon.validityStart) return { ok: false, reason: "Coupon not started yet" };
  if (coupon.validityEnd && onDate > coupon.validityEnd) return { ok: false, reason: "Coupon expired" };
  if (coupon.flashEndsAt && at > new Date(coupon.flashEndsAt)) return { ok: false, reason: "Flash offer ended" };

  const days = coupon.validDays === "all" ? [] : parseList(coupon.validDays);
  if (days.length > 0 && !days.includes(dayKey(at))) return { ok: false, reason: "Not valid today" };

  if (coupon.validTimeStart && coupon.validTimeEnd) {
    const t = timeStr(at);
    if (t < coupon.validTimeStart || t > coupon.validTimeEnd) return { ok: false, reason: "Outside valid hours" };
  }

  if (coupon.targetCustomerId && coupon.targetCustomerId !== customerId) {
    return { ok: false, reason: "Coupon not issued to this customer" };
  }

  const segment = coupon.customerSegment;
  if (segment === "new_customer" && !isNewCustomer(ctx.db, customerId)) return { ok: false, reason: "New customers only" };
  if (segment === "existing_customer" && isNewCustomer(ctx.db, customerId)) {
    return { ok: false, reason: "Existing customers only" };
  }
  if (segment === "birthday" && !isBirthdayWindow(str(ctx.customer, "birthday"))) {
    return { ok: false, reason: "Birthday week only" };
  }
  if (segment === "anniversary" && !isBirthdayWindow(str(ctx.customer, "anniversary"))) {
    return { ok: false, reason: "Anniversary week only" };
  }
  if (segment === "vip" && str(ctx.customer, "tier") !== "Platinum" && str(ctx.customer, "tier") !== "Gold") {
    return { ok: false, reason: "VIP customers only" };
  }
  if (segment === "gold" && str(ctx.customer, "tier") !== "Gold") return { ok: false, reason: "Gold tier only" };
  if (segment === "platinum" && str(ctx.customer, "tier") !== "Platinum") {
    return { ok: false, reason: "Platinum tier only" };
  }
  if (segment === "inactive" && !isInactiveCustomer(ctx.customer, coupon.inactiveDays, onDate)) {
    return { ok: false, reason: `Inactive ${coupon.inactiveDays}+ days only` };
  }
  if (segment === "first_purchase") {
    const invoices = (ctx.db["invoices"] ?? []).filter((i) => String(i["customerId"]) === customerId);
    if (invoices.length > 0) return { ok: false, reason: "First purchase only" };
  }

  if (coupon.firstAppointmentOnly === "Yes" && !ctx.isFirstAppointment) {
    return { ok: false, reason: "First appointment only" };
  }
  if (coupon.advanceBookingDays > 0 && (ctx.advanceBookingDays ?? 0) < coupon.advanceBookingDays) {
    return { ok: false, reason: `Book ${coupon.advanceBookingDays}+ days ahead` };
  }
  if (coupon.staffId && ctx.staffId && coupon.staffId !== ctx.staffId) {
    return { ok: false, reason: "Selected stylist not eligible" };
  }
  if (coupon.paymentMethod !== "Any" && ctx.paymentMethod && coupon.paymentMethod !== ctx.paymentMethod) {
    return { ok: false, reason: `${coupon.paymentMethod} payment required` };
  }

  const usageReason = usageBlocked(ctx.db, coupon, customerId, at);
  if (usageReason) return { ok: false, reason: usageReason };

  const cart = ctx.cart ?? [];
  const subtotal = cart.length > 0 ? eligibleCartSubtotal(coupon, cart) : 0;
  const bill = subtotal || num(ctx.customer as Row, "lastBillAmount");
  if (coupon.minBillAmount > 0 && bill < coupon.minBillAmount) {
    return { ok: false, reason: `Minimum bill ₹${coupon.minBillAmount}` };
  }
  if (coupon.minBookingValue > 0 && bill < coupon.minBookingValue) {
    return { ok: false, reason: `Minimum booking ₹${coupon.minBookingValue}` };
  }
  if (coupon.minQuantity > 0 && cart.length > 0) {
    const qty = cart.reduce((s, l) => s + l.qty, 0);
    if (qty < coupon.minQuantity) return { ok: false, reason: `Minimum ${coupon.minQuantity} items` };
  }

  return { ok: true };
}

export function calculateCouponDiscount(coupon: CouponRule, subtotal: number, cart: CartLine[] = []) {
  const base = cart.length > 0 ? eligibleCartSubtotal(coupon, cart) : subtotal;
  if (base <= 0 && coupon.discountType !== "free_service" && coupon.discountType !== "free_addon") return 0;

  let discount = 0;
  switch (coupon.discountType) {
    case "percentage": {
      discount = Math.round(base * (coupon.discountValue / 100));
      if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
      break;
    }
    case "fixed_amount":
      discount = coupon.discountValue;
      break;
    case "slab_based":
      discount = slabDiscountForBill(parseDiscountSlabs(coupon.discountSlabs), base);
      break;
    case "flat_price":
      discount = Math.max(0, base - coupon.flatPrice);
      break;
    case "buy_x_get_y": {
      const unit = base / Math.max(1, cart.reduce((s, l) => s + l.qty, 0) || 1);
      const sets = Math.floor(cart.reduce((s, l) => s + l.qty, 0) / (coupon.buyQty + coupon.freeQty));
      discount = Math.round(sets * coupon.freeQty * unit);
      break;
    }
    case "free_service":
    case "free_addon":
      discount = coupon.discountValue > 0 ? coupon.discountValue : Math.round(base * 0.1);
      break;
    default:
      discount = 0;
  }
  return Math.min(Math.max(0, discount), subtotal > 0 ? subtotal : base);
}

export function describeCoupon(coupon: CouponRule) {
  switch (coupon.discountType) {
    case "percentage":
      return coupon.maxDiscount > 0
        ? `${coupon.discountValue}% off (max ₹${coupon.maxDiscount})`
        : `${coupon.discountValue}% off`;
    case "fixed_amount":
      return `₹${coupon.discountValue} off`;
    case "slab_based": {
      const slabs = parseDiscountSlabs(coupon.discountSlabs);
      if (slabs.length === 0) return "Slab discount";
      return slabs
        .map((s) => {
          const range = s.maxBill > 0 ? `₹${s.minBill}–₹${s.maxBill}` : `₹${s.minBill}+`;
          return `${range} → ₹${s.discount} off`;
        })
        .join(" · ");
    }
    case "flat_price":
      return `Flat ₹${coupon.flatPrice}`;
    case "buy_x_get_y":
      return `Buy ${coupon.buyQty} get ${coupon.freeQty} free`;
    case "free_service":
      return coupon.freeItemName ? `Free ${coupon.freeItemName}` : "Free service";
    case "free_addon":
      return coupon.freeItemName ? `Free ${coupon.freeItemName}` : "Free add-on";
    default:
      return coupon.title;
  }
}

export function couponHeadline(coupon: CouponRule) {
  if (coupon.title.trim()) return coupon.title;
  return describeCoupon(coupon);
}

export function couponConditionsSummary(coupon: CouponRule) {
  const parts: string[] = [];
  if (coupon.minBillAmount > 0) parts.push(`Min bill ₹${coupon.minBillAmount}`);
  if (coupon.minQuantity > 0) parts.push(`Min qty ${coupon.minQuantity}`);
  if (coupon.customerSegment !== "all") {
    const seg = coupon.customerSegment.replace(/_/g, " ");
    parts.push(seg);
  }
  if (coupon.appliesTo !== "entire_bill") {
    parts.push(coupon.appliesTo.replace(/_/g, " "));
  }
  if (coupon.usageLimitMode === "per_customer") parts.push(`${coupon.perCustomerLimit}× per customer`);
  if (coupon.validTimeStart && coupon.validTimeEnd) parts.push(`${coupon.validTimeStart}–${coupon.validTimeEnd}`);
  return parts.join(" · ") || "No extra conditions";
}

/** Resolve coupon from redemption row (new coupons or legacy offers). */
export type CouponUsageStore = {
  db: Db;
  create: (collection: string, row: Row, orgOverride?: string) => void;
  update: (collection: string, id: string, row: Row) => void;
};

/** Record coupon usage after a successful bill (not loyalty points). */
export function recordCouponUsage(
  store: CouponUsageStore,
  input: {
    orgId: EntityId;
    locationId: EntityId;
    couponId: EntityId;
    code: string;
    customerId: EntityId;
    invoiceId: EntityId;
    discountAmount: number;
    voucherId?: string;
    staffId?: string;
    staff?: string;
  },
) {
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const today = stamp.slice(0, 10);

  store.create(COUPON_REDEMPTIONS, {
    id: `CR-${Date.now().toString().slice(-8)}`,
    orgId: input.orgId,
    locationId: input.locationId,
    couponId: input.couponId,
    voucherId: input.voucherId ?? "",
    code: input.code,
    customerId: input.customerId,
    invoiceId: input.invoiceId,
    discountAmount: input.discountAmount,
    staffId: input.staffId ?? "",
    staff: input.staff ?? "",
    status: "Used",
    redeemedAt: stamp,
    issuedAt: today,
  });

  const schemeRow = (store.db[COUPONS_COLLECTION] ?? []).find((c) => String(c.id) === input.couponId);
  if (schemeRow) {
    store.update(COUPONS_COLLECTION, String(schemeRow.id), {
      ...schemeRow,
      usageCount: Number(schemeRow["usageCount"] ?? 0) + 1,
    });
  }
}

export function couponFromRedemption(db: Db, redemption: Row): CouponRule | null {
  const couponId = String(redemption["couponId"] ?? redemption["offerId"] ?? "");
  const fromCoupons = (db[COUPONS_COLLECTION] ?? []).find((c) => String(c.id) === couponId);
  if (fromCoupons) return normalizeCoupon(fromCoupons, "coupons");
  const fromOffers = (db[QR_OFFERS] ?? []).find((o) => String(o.id) === couponId);
  if (fromOffers) return normalizeCoupon(fromOffers, "qrOffers");
  return null;
}
