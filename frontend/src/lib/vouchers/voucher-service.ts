import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import type { BillLine } from "@/lib/pos";
import {
  calculateCouponDiscount,
  evaluateCouponEligibility,
  normalizeCoupon,
  recordCouponUsage,
  type CartLine,
} from "@/lib/coupons/coupon-engine";
import type { CouponRule } from "@/lib/coupons/coupon-schema";

export const VOUCHERS = "vouchers";

/** Quanto-style voucher types. */
export const VoucherType = {
  GiftVoucher: 1,
  Coupon: 2,
  BirthdayCoupon: 5,
  CreditNote: 7,
  CustomerAdvance: 8,
} as const;

export type VoucherTypeName = keyof typeof VoucherType;

const REDEEMABLE_TYPES = new Set<VoucherTypeName>(["Coupon", "BirthdayCoupon", "GiftVoucher", "CreditNote"]);

export type VoucherStatus = {
  ok: boolean;
  error?: string;
  voucher?: Row;
  scheme?: CouponRule;
  /** Face value stored on voucher (if any). */
  available: number;
  /** Max redeemable on this bill after scheme rules. */
  convertable: number;
  eligibleSubtotal: number;
  lineSplits: { lineId: string; couponDiscount: number }[];
};

export type BillCouponContext = {
  db: Db;
  customer: Row;
  lines: BillLine[];
  orgId: EntityId;
  locationId: EntityId;
  paymentMethod?: string;
  otherDiscount?: number;
  membershipDiscount?: number;
  alreadyAppliedVoucherIds?: string[];
  at?: Date;
};

function str(row: Row, key: string, fallback = "") {
  return String(row[key] ?? fallback);
}

function voucherTypeName(row: Row): VoucherTypeName {
  const raw = str(row, "voucherType", "Coupon");
  if (raw in VoucherType) return raw as VoucherTypeName;
  const n = Number(raw);
  const entry = Object.entries(VoucherType).find(([, v]) => v === n);
  return (entry?.[0] as VoucherTypeName) ?? "Coupon";
}

function billLinesToCart(lines: BillLine[], services: Row[], products: Row[]): CartLine[] {
  return lines.map((l) => {
    const svc = l.kind === "service" ? services.find((s) => String(s.id) === l.id) : null;
    const prod = l.kind === "product" ? products.find((p) => String(p.id) === l.id) : null;
    return {
      type: l.kind,
      id: l.id,
      category: String(svc?.["category"] ?? prod?.["brand"] ?? ""),
      name: l.name,
      qty: l.qty,
      price: l.price,
    };
  });
}

function eligibleLineIds(
  scheme: CouponRule,
  cart: CartLine[],
  ctx: { otherDiscount: number; membershipDiscount: number; exDiscount: boolean; exAddlDiscount: boolean; exSchemeDiscount: boolean },
): Set<string> {
  const targets = scheme.targetIds
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const ids = new Set<string>();
  for (const line of cart) {
    if (ctx.exAddlDiscount && ctx.otherDiscount > 0) continue;
    if (ctx.exSchemeDiscount && ctx.membershipDiscount > 0) continue;

    if (scheme.appliesTo === "entire_bill") {
      ids.add(line.id);
      continue;
    }
    if (scheme.appliesTo === "services" && line.type !== "service") continue;
    if (scheme.appliesTo === "products" && line.type !== "product") continue;
    if (scheme.appliesTo === "categories") {
      if (line.type === "service" && (targets.length === 0 || targets.includes(line.category.toLowerCase()))) {
        ids.add(line.id);
      }
      continue;
    }
    if (scheme.appliesTo === "service_product" && (line.type === "service" || line.type === "product")) {
      ids.add(line.id);
      continue;
    }
    if (targets.length > 0) {
      if (targets.includes(line.id.toLowerCase()) || targets.includes(line.category.toLowerCase())) ids.add(line.id);
      continue;
    }
    ids.add(line.id);
  }
  return ids;
}

/** Split coupon amount proportionally by line receivable (Quanto ApplyAdditionalDiscount). */
export function splitCouponOnLines(
  amount: number,
  lines: BillLine[],
  eligibleIds?: Set<string>,
): { lineId: string; couponDiscount: number }[] {
  const pool = lines.filter((l) => !eligibleIds || eligibleIds.has(l.id));
  const receivable = pool.reduce((s, l) => s + l.price * l.qty, 0);
  if (receivable <= 0 || amount <= 0) return [];

  let allocated = 0;
  const splits: { lineId: string; couponDiscount: number }[] = [];
  for (let i = 0; i < pool.length; i++) {
    const l = pool[i];
    const share = l.price * l.qty;
    const isLast = i === pool.length - 1;
    const part = isLast ? amount - allocated : Math.round((amount * share) / receivable);
    allocated += part;
    if (part > 0) splits.push({ lineId: l.id, couponDiscount: part });
  }
  return splits;
}

function schemeFromVoucher(db: Db, voucher: Row): CouponRule | null {
  const couponId = str(voucher, "couponId");
  if (!couponId) return null;
  const row = (db["coupons"] ?? []).find((c) => String(c.id) === couponId);
  if (!row) return null;
  return normalizeCoupon(row, "coupons");
}

export function findVoucherByCode(db: Db, code: string, orgId?: EntityId) {
  const q = code.trim().replace(/^#/, "").toLowerCase();
  if (!q) return null;
  return (db[VOUCHERS] ?? []).find((v) => {
    if (orgId && str(v, "orgId") && str(v, "orgId") !== orgId) return false;
    return str(v, "code").replace(/^#/, "").toLowerCase() === q;
  });
}

/** POS SearchCoupon / FindStatus equivalent. */
export function findVoucherStatus(input: BillCouponContext & { code: string }): VoucherStatus {
  const fail = (error: string, partial?: Partial<VoucherStatus>): VoucherStatus => ({
    ok: false,
    error,
    available: 0,
    convertable: 0,
    eligibleSubtotal: 0,
    lineSplits: [],
    ...partial,
  });

  const voucher = findVoucherByCode(input.db, input.code, input.orgId);
  if (!voucher) return fail("Coupon code not found");

  const type = voucherTypeName(voucher);
  if (!REDEEMABLE_TYPES.has(type)) return fail(`Voucher type ${type} cannot be applied at POS`);

  const used = str(voucher, "billId") || str(voucher, "invoiceId") || str(voucher, "status") === "Redeemed";
  const unlimited = str(voucher, "unlimited") === "Yes";
  if (str(voucher, "status") === "Cancelled") return fail("Coupon cancelled", { voucher });
  if (used && !unlimited) return fail("Coupon already used", { voucher });

  const issueTo = str(voucher, "issueTo") || str(voucher, "customerId");
  if (issueTo && issueTo !== String(input.customer.id)) {
    return fail("Coupon issued to another customer", { voucher });
  }

  if (input.alreadyAppliedVoucherIds?.includes(String(voucher.id))) {
    return fail("Coupon already applied on this bill", { voucher });
  }

  const scheme = schemeFromVoucher(input.db, voucher);
  if (!scheme) return fail("Coupon scheme not found", { voucher });

  const services = input.db["services"] ?? [];
  const products = input.db["inventory"] ?? [];
  const cart = billLinesToCart(input.lines, services, products);

  const eligibility = evaluateCouponEligibility(scheme, {
    db: input.db,
    customer: input.customer,
    orgId: input.orgId,
    locationId: input.locationId === "all" ? str(voucher, "locationId") || input.locationId : input.locationId,
    paymentMethod: input.paymentMethod,
    cart,
    at: input.at,
  });
  if (!eligibility.ok) return fail(eligibility.reason ?? "Not eligible", { voucher, scheme });

  const exDiscount = str(scheme as Row, "ex_discount") === "Yes";
  const exAddlDiscount = str(scheme as Row, "ex_adiscount") === "Yes";
  const exSchemeDiscount = str(scheme as Row, "ex_sdiscount") === "Yes";

  const eligibleIds = eligibleLineIds(scheme, cart, {
    otherDiscount: input.otherDiscount ?? 0,
    membershipDiscount: input.membershipDiscount ?? 0,
    exDiscount,
    exAddlDiscount,
    exSchemeDiscount,
  });

  const eligibleSubtotal = cart
    .filter((l) => eligibleIds.has(l.id))
    .reduce((s, l) => s + l.price * l.qty, 0);

  if (scheme.minBillAmount > 0 && eligibleSubtotal < scheme.minBillAmount) {
    return fail(`Minimum eligible bill ₹${scheme.minBillAmount}`, { voucher, scheme, eligibleSubtotal });
  }

  let convertable = calculateCouponDiscount(scheme, eligibleSubtotal, cart.filter((l) => eligibleIds.has(l.id)));
  const face = Number(voucher["amount"] ?? 0);
  const available = face > 0 ? face : convertable;
  if (face > 0) convertable = Math.min(convertable, face);
  convertable = Math.min(convertable, eligibleSubtotal);

  if (convertable <= 0) return fail("No discount applicable on this bill", { voucher, scheme, eligibleSubtotal });

  const lineSplits = splitCouponOnLines(convertable, input.lines, eligibleIds);

  return {
    ok: true,
    voucher,
    scheme,
    available,
    convertable,
    eligibleSubtotal,
    lineSplits,
  };
}

export function voucherDiscountForBill(
  db: Db,
  voucherIds: string[],
  ctx: Omit<BillCouponContext, "alreadyAppliedVoucherIds">,
): { total: number; lines: { voucherId: string; code: string; amount: number; splits: VoucherStatus["lineSplits"] }[] } {
  const out: { voucherId: string; code: string; amount: number; splits: VoucherStatus["lineSplits"] }[] = [];
  let remaining = ctx.lines.reduce((s, l) => s + l.price * l.qty, 0) - (ctx.otherDiscount ?? 0) - (ctx.membershipDiscount ?? 0);
  const applied: string[] = [];

  for (const voucherId of voucherIds) {
    const voucher = (db[VOUCHERS] ?? []).find((v) => String(v.id) === voucherId);
    if (!voucher) continue;
    const status = findVoucherStatus({
      ...ctx,
      code: str(voucher, "code"),
      alreadyAppliedVoucherIds: applied,
    });
    if (!status.ok || !status.convertable) continue;
    const amount = Math.min(status.convertable, remaining);
    if (amount <= 0) continue;
    out.push({
      voucherId,
      code: str(voucher, "code"),
      amount,
      splits: splitCouponOnLines(amount, ctx.lines, new Set(status.lineSplits.map((s) => s.lineId))),
    });
    applied.push(voucherId);
    remaining -= amount;
  }

  return { total: out.reduce((s, l) => s + l.amount, 0), lines: out };
}

export function generateVoucherCode(schemeCode: string) {
  const base = schemeCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "CPN";
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
}

export function issueVoucher(
  store: { db: Db; create: (c: string, r: Row) => void },
  input: {
    couponId: EntityId;
    customerId: EntityId;
    orgId: EntityId;
    locationId: EntityId;
    amount?: number;
    voucherType?: VoucherTypeName;
    code?: string;
  },
) {
  const schemeRow = (store.db["coupons"] ?? []).find((c) => String(c.id) === input.couponId);
  if (!schemeRow) return { ok: false, error: "Coupon scheme not found" };

  const scheme = normalizeCoupon(schemeRow, "coupons");
  const code = input.code?.trim() || generateVoucherCode(scheme.code);
  const today = new Date().toISOString().slice(0, 10);

  const voucher: Row = {
    id: `V-${Date.now().toString().slice(-8)}`,
    orgId: input.orgId,
    locationId: input.locationId,
    couponId: input.couponId,
    code,
    voucherType: input.voucherType ?? "Coupon",
    amount: input.amount ?? 0,
    issueTo: input.customerId,
    customerId: input.customerId,
    billId: "",
    invoiceId: "",
    status: input.customerId ? "Issued" : "Available",
    unlimited: "No",
    issuedAt: today,
    redeemedAt: "",
    schemeCode: scheme.code,
    schemeTitle: scheme.title,
  };

  store.create(VOUCHERS, voucher);
  return { ok: true, voucher };
}

/** Bill save — mark voucher used (ApplyCoupon). */
export function claimVoucherAtPos(
  store: {
    db: Db;
    create: (c: string, r: Row, orgOverride?: string) => void;
    update: (c: string, id: string, r: Row) => void;
  },
  input: {
    voucherId: string;
    invoiceId: EntityId;
    discountAmount: number;
    customerId?: string;
    locationId?: EntityId;
    staffId?: string;
    staff?: string;
  },
) {
  const voucher = (store.db[VOUCHERS] ?? []).find((v) => String(v.id) === input.voucherId);
  if (!voucher) return { ok: false, error: "Voucher not found" };

  const used = str(voucher, "billId") || str(voucher, "invoiceId");
  if (used && str(voucher, "unlimited") !== "Yes") {
    return { ok: false, duplicate: true, error: "Coupon already used" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const redeemCustomer = input.customerId || str(voucher, "issueTo") || str(voucher, "customerId");
  store.update(VOUCHERS, input.voucherId, {
    ...voucher,
    status: "Redeemed",
    billId: input.invoiceId,
    invoiceId: input.invoiceId,
    redeemedAt: today,
    discountAmount: input.discountAmount,
    redeemedLocationId: input.locationId || str(voucher, "locationId"),
    issueTo: redeemCustomer,
    customerId: redeemCustomer,
  });

  recordCouponUsage(store, {
    orgId: str(voucher, "orgId"),
    locationId: str(voucher, "locationId"),
    couponId: str(voucher, "couponId"),
    code: str(voucher, "code"),
    customerId: redeemCustomer,
    invoiceId: input.invoiceId,
    discountAmount: input.discountAmount,
    voucherId: input.voucherId,
    staffId: input.staffId,
    staff: input.staff,
  });

  return { ok: true };
}

export function listCustomerVouchers(db: Db, customerId: EntityId, orgId?: EntityId) {
  return (db[VOUCHERS] ?? []).filter((v) => {
    if (String(v["issueTo"] ?? v["customerId"]) !== customerId) return false;
    if (orgId && str(v, "orgId") && str(v, "orgId") !== orgId) return false;
    if (str(v, "status") === "Redeemed" || str(v, "billId") || str(v, "invoiceId")) return false;
    return true;
  });
}

export function allowDuplicateCoupons(db: Db, orgId: EntityId) {
  const org = (db["organizations"] ?? []).find((o) => String(o["orgId"]) === orgId);
  return String(org?.["sale_duplicatecoupon"] ?? "No") === "Yes";
}
