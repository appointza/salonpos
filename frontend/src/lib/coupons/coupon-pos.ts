import type { Db, Row } from "@/lib/store";
import type { BillLine } from "@/lib/pos";
import {
  calculateCouponDiscount,
  couponHeadline,
  evaluateCouponEligibility,
  findCouponSchemeByCode,
  type CartLine,
} from "@/lib/coupons/coupon-engine";
import type { CouponRule } from "@/lib/coupons/coupon-schema";
import { recordCouponUsage } from "@/lib/coupons/coupon-engine";
import { isMasterSchemeCodeRedeemable } from "@/lib/coupons/coupon-code-pool";
import {
  claimVoucherAtPos,
  findVoucherStatus,
  splitCouponOnLines,
  type BillCouponContext,
} from "@/lib/vouchers/voucher-service";

export type AppliedCouponLine = {
  code: string;
  couponId: string;
  voucherId?: string;
  title: string;
  amount: number;
  splits: { lineId: string; couponDiscount: number }[];
};

export type CouponPosContext = Omit<BillCouponContext, "code" | "alreadyAppliedVoucherIds"> & {
  staffId?: string;
};

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

function schemePosStatus(
  scheme: CouponRule,
  ctx: CouponPosContext,
  cart: CartLine[],
  alreadyAppliedCouponIds: string[],
) {
  if (alreadyAppliedCouponIds.includes(scheme.id)) {
    return { ok: false, reason: "Coupon already applied on this bill" };
  }

  const effLocation =
    ctx.locationId === "all" ? scheme.locationId || ctx.locationId : ctx.locationId;

  const eligibility = evaluateCouponEligibility(scheme, {
    db: ctx.db,
    customer: ctx.customer,
    orgId: ctx.orgId,
    locationId: effLocation,
    paymentMethod: ctx.paymentMethod,
    staffId: ctx.staffId,
    cart,
    at: ctx.at,
  });
  if (!eligibility.ok) return eligibility;

  const eligibleSubtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const amount = calculateCouponDiscount(scheme, eligibleSubtotal, cart);
  if (amount <= 0) return { ok: false, reason: "No discount applicable on this bill" };

  const splits = splitCouponOnLines(amount, ctx.lines);
  return {
    ok: true,
    amount: Math.min(amount, eligibleSubtotal),
    eligibleSubtotal,
    splits,
  };
}

/** Validate a coupon code at POS — issued voucher first, then scheme code. */
export function validateCouponCodeAtPos(ctx: CouponPosContext & { code: string; alreadyAppliedCodes?: string[] }) {
  const fail = (reason: string) => ({ ok: false as const, reason });

  const code = ctx.code.trim();
  if (!code) return fail("Enter a coupon code");

  const appliedCodes = new Set((ctx.alreadyAppliedCodes ?? []).map((c) => c.toLowerCase()));
  if (appliedCodes.has(code.toLowerCase())) return fail("Coupon already applied on this bill");

  const voucherStatus = findVoucherStatus({
    ...ctx,
    code,
    alreadyAppliedVoucherIds: [],
  });
  if (voucherStatus.ok && voucherStatus.scheme && voucherStatus.voucher) {
    return {
      ok: true as const,
      code,
      couponId: voucherStatus.scheme.id,
      voucherId: String(voucherStatus.voucher.id),
      title: couponHeadline(voucherStatus.scheme),
      amount: voucherStatus.convertable,
      splits: voucherStatus.lineSplits,
    };
  }

  const scheme = findCouponSchemeByCode(ctx.db, code, ctx.orgId);
  if (!scheme) {
    return fail(voucherStatus.error ?? "Coupon code not found");
  }

  const schemeRow = (ctx.db["coupons"] ?? []).find((c) => String(c.id) === scheme.id);
  if (schemeRow && !isMasterSchemeCodeRedeemable(ctx.db, schemeRow)) {
    return fail("This campaign uses unique codes — enter one from the code pool");
  }

  const services = ctx.db["services"] ?? [];
  const products = ctx.db["inventory"] ?? [];
  const cart = billLinesToCart(ctx.lines, services, products);
  const appliedIds: string[] = [];
  for (const existing of ctx.alreadyAppliedCodes ?? []) {
    const existingScheme = findCouponSchemeByCode(ctx.db, existing, ctx.orgId);
    if (existingScheme) appliedIds.push(existingScheme.id);
  }

  const status = schemePosStatus(scheme, ctx, cart, appliedIds);
  if (!status.ok) return fail(status.reason ?? "Coupon not valid");

  return {
    ok: true as const,
    code: scheme.code,
    couponId: scheme.id,
    title: couponHeadline(scheme),
    amount: status.amount ?? 0,
    splits: status.splits ?? [],
  };
}

/** Compute stacked coupon discounts for applied codes. */
export function computeCouponDiscounts(
  db: Db,
  codes: string[],
  ctx: CouponPosContext,
): { total: number; lines: AppliedCouponLine[] } {
  const out: AppliedCouponLine[] = [];
  let remaining = ctx.lines.reduce((s, l) => s + l.price * l.qty, 0);
  remaining -= (ctx.otherDiscount ?? 0) + (ctx.membershipDiscount ?? 0);
  const appliedCodes: string[] = [];

  for (const code of codes) {
    const status = validateCouponCodeAtPos({ ...ctx, code, alreadyAppliedCodes: appliedCodes });
    if (!status.ok) continue;
    const amount = Math.min(status.amount, remaining);
    if (amount <= 0) continue;
    out.push({
      code: status.code,
      couponId: status.couponId,
      voucherId: status.voucherId,
      title: status.title,
      amount,
      splits: splitCouponOnLines(amount, ctx.lines),
    });
    appliedCodes.push(status.code);
    remaining -= amount;
  }

  return { total: out.reduce((s, l) => s + l.amount, 0), lines: out };
}

export function claimCouponsAtPos(
  store: {
    db: Db;
    create: (c: string, r: Row, orgOverride?: string) => void;
    update: (c: string, id: string, r: Row) => void;
  },
  input: {
    lines: AppliedCouponLine[];
    invoiceId: string;
    orgId: string;
    locationId: string;
    customerId: string;
    staffId?: string;
    staff?: string;
  },
) {
  for (const line of input.lines) {
    if (line.voucherId) {
      claimVoucherAtPos(store, {
        voucherId: line.voucherId,
        invoiceId: input.invoiceId,
        discountAmount: line.amount,
        customerId: input.customerId,
        locationId: input.locationId,
        staffId: input.staffId,
        staff: input.staff,
      });
      continue;
    }
    recordCouponUsage(store, {
      orgId: input.orgId,
      locationId: input.locationId,
      couponId: line.couponId,
      code: line.code,
      customerId: input.customerId,
      invoiceId: input.invoiceId,
      discountAmount: line.amount,
      staffId: input.staffId,
      staff: input.staff,
    });
  }
}
