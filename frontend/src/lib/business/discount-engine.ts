import type { Row } from "@/lib/store";
import type { BillLine } from "@/lib/pos";
import { billTotals } from "@/lib/pos";
import { earnPoints, pointsToRupees, resolveLoyaltyRule } from "@/lib/loyalty-rules";
import {
  applyMembershipBenefits,
  findLiveMembership,
  planForEnrollment,
} from "@/lib/membership";
import { computeRewardDiscounts, type RewardRefs } from "@/lib/rewards/reward-quote";
import { computeCouponDiscounts } from "@/lib/coupons/coupon-pos";
import type { UnifiedQuote } from "@/lib/business/types";

export type QuoteInput = {
  customer: Row | null;
  lines: BillLine[];
  discount: number;
  pointsRedeemed: number;
  rewards?: RewardRefs;
  couponCodes?: string[];
  paymentMethod?: string;
  staffId?: string;
};

/**
 * Single discount pipeline for POS:
 * subtotal → membership → manual discount → rewards → coupons → loyalty → tax
 */
export function quoteUnifiedSale(
  input: QuoteInput,
  db: Record<string, Row[]>,
  ctx: { orgId: string; locationId: string },
): UnifiedQuote {
  const programs = (db["loyalty"] ?? []).filter((p) => String(p["orgId"]) === ctx.orgId);
  const org = (db["organizations"] ?? []).find((o) => String(o["orgId"]) === ctx.orgId);
  const rule = resolveLoyaltyRule(programs, org, {
    locationId: ctx.locationId === "all" ? "" : ctx.locationId,
    tier: String(input.customer?.["tier"] ?? "All"),
  });

  const memberships = (db["memberships"] ?? []).filter((m) => String(m["orgId"]) === ctx.orgId);
  const plans = (db["membershipPlans"] ?? []).filter((p) => String(p["orgId"]) === ctx.orgId);
  const usage = (db["membershipUsage"] ?? []).filter((u) => String(u["orgId"]) === ctx.orgId);
  const services = db["services"] ?? [];

  const membership = input.customer
    ? findLiveMembership(memberships, { id: input.customer.id, membershipId: input.customer["membershipId"] ?? "" })
    : null;
  const plan = membership ? planForEnrollment(membership, plans) : null;
  const benefit = applyMembershipBenefits(membership, input.lines, services, plans, usage);

  const subtotal = input.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const otherDiscount = Math.max(0, Number(input.discount) || 0);
  const afterMember = Math.max(0, subtotal - benefit.amount - otherDiscount);

  const rewardQuote = input.customer
    ? computeRewardDiscounts(db, input.rewards ?? {}, afterMember)
    : { total: 0, lines: [] as { label: string; amount: number }[] };

  const afterRewards = Math.max(0, afterMember - rewardQuote.total);

  const couponQuote =
    input.customer && (input.couponCodes?.length ?? 0) > 0
      ? computeCouponDiscounts(db, input.couponCodes ?? [], {
          db,
          orgId: ctx.orgId,
          locationId: ctx.locationId,
          customer: input.customer,
          lines: input.lines,
          paymentMethod: input.paymentMethod ?? "Any",
          staffId: input.staffId,
          otherDiscount: otherDiscount + rewardQuote.total,
          membershipDiscount: benefit.amount,
          at: new Date(),
        })
      : { total: 0, lines: [] };

  const afterCoupons = Math.max(0, afterRewards - couponQuote.total);

  const maxPts = rule.rupeesPerPoint > 0 ? Math.floor(afterCoupons / rule.rupeesPerPoint) : 0;
  const available = Number(input.customer?.["points"] ?? 0);
  const redeem = Math.max(0, Math.min(input.pointsRedeemed, available, maxPts));
  const loyaltyValue = pointsToRupees(redeem, rule);

  const t = billTotals(
    input.lines,
    otherDiscount,
    benefit.amount,
    rewardQuote.total + couponQuote.total,
    loyaltyValue,
  );
  const pointsToEarn = earnPoints(t.taxable, rule);

  return {
    subtotal: t.subtotal,
    membershipDiscount: benefit.amount,
    rewardDiscount: rewardQuote.total,
    rewardLines: rewardQuote.lines.map((l) => ({ label: l.label, amount: l.amount })),
    couponDiscount: couponQuote.total,
    couponLines: couponQuote.lines,
    otherDiscount,
    loyaltyValue,
    taxable: t.taxable,
    tax: t.tax,
    total: t.total,
    pointsToEarn,
    membership,
    plan,
    benefit,
    rule,
  };
}
