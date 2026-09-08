import { useCallback } from "react";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { earnPoints, pointsToRupees, resolveLoyaltyRule, type LoyaltyRule } from "@/lib/loyalty-rules";
import { addExpiry, postLoyaltyTransaction, postLoyaltyReversal, LOYALTY_TX } from "@/lib/loyalty/loyalty-service";
import { redeemOfferAtPos } from "@/lib/offers/offer-redemption-service";
import { redeemPartnerCouponAtPos } from "@/lib/partners/partner-coupon-service";
import { redeemWheelSpinAtPos } from "@/lib/wheel/wheel-service";
import { computeRewardDiscounts, type RewardRefs } from "@/lib/rewards/reward-quote";
import {
  applyMembershipBenefits,
  findLiveMembership,
  planForEnrollment,
  type MembershipBenefit,
} from "@/lib/membership";
import { useStockService } from "@/lib/stock";

export type BillLine = {
  id: string;
  kind: "service" | "product";
  name: string;
  price: number;
  gstRate: number;
  qty: number;
  commission: number;
  staff: string;
  staffId: string;
};

export type SaleInput = {
  customer: Row;
  lines: BillLine[];
  discount: number;
  pointsRedeemed: number;
  payment: string;
  appointmentId?: string;
  rewards?: RewardRefs;
};

export type CartQuote = {
  subtotal: number;
  membershipDiscount: number;
  rewardDiscount: number;
  rewardLines: { label: string; amount: number }[];
  otherDiscount: number;
  loyaltyValue: number;
  taxable: number;
  tax: number;
  total: number;
  pointsToEarn: number;
  membership: Row | null;
  plan: Row | null;
  benefit: MembershipBenefit;
  rule: LoyaltyRule;
};

export function billTotals(
  lines: BillLine[],
  discount: number,
  membershipDiscount: number,
  rewardDiscount: number,
  pointsValue: number,
) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const deductions = Math.min(discount + membershipDiscount + rewardDiscount + pointsValue, subtotal);
  const taxable = Math.max(subtotal - deductions, 0);
  const tax = lines.reduce((s, l) => {
    const share = subtotal ? (l.price * l.qty) / subtotal : 0;
    return s + taxable * share * (l.gstRate / 100);
  }, 0);
  return { subtotal, deductions, taxable, tax, total: taxable + tax };
}

export function quoteSale(
  input: {
    customer: Row | null;
    lines: BillLine[];
    discount: number;
    pointsRedeemed: number;
    rewards?: RewardRefs;
  },
  db: Record<string, Row[]>,
  ctx: { orgId: string; locationId: string },
): CartQuote {
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
  const otherDiscount = Math.max(0, Number(input.discount) || 0);
  const afterMember = Math.max(0, input.lines.reduce((s, l) => s + l.price * l.qty, 0) - benefit.amount - otherDiscount);
  const rewardQuote = input.customer
    ? computeRewardDiscounts(db, input.rewards ?? {}, afterMember)
    : { total: 0, lines: [] as { label: string; amount: number }[] };
  const afterRewards = Math.max(0, afterMember - rewardQuote.total);
  const maxPts = rule.rupeesPerPoint > 0 ? Math.floor(afterRewards / rule.rupeesPerPoint) : 0;
  const available = Number(input.customer?.["points"] ?? 0);
  const redeem = Math.max(0, Math.min(input.pointsRedeemed, available, maxPts));
  const loyaltyValue = pointsToRupees(redeem, rule);
  const t = billTotals(input.lines, otherDiscount, benefit.amount, rewardQuote.total, loyaltyValue);
  const pointsToEarn = earnPoints(t.taxable, rule);
  return {
    subtotal: t.subtotal,
    membershipDiscount: benefit.amount,
    rewardDiscount: rewardQuote.total,
    rewardLines: rewardQuote.lines.map((l) => ({ label: l.label, amount: l.amount })),
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

export const AUDIT = "auditLog";
export { LOYALTY_TX };
export const MEMBERSHIP_USAGE = "membershipUsage";

export function usePostSale() {
  const { db, allRows, create, update } = useData();
  const { org, location, locationId } = useTenant();
  const stock = useStockService();

  return useCallback(
    (input: SaleInput) => {
      const { customer, lines, discount, pointsRedeemed, payment, appointmentId, rewards } = input;
      const quote = quoteSale(
        { customer, lines, discount, pointsRedeemed, rewards },
        allRows,
        { orgId: org.orgId, locationId },
      );
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const today = stamp.slice(0, 10);
      const outlet = location?.name ?? String(customer["outlet"] ?? "All");
      const effLocation = locationId === "all" ? String(customer["locationId"] ?? org.locations[0]?.locationId ?? "") : locationId;
      const membershipId = quote.membership ? String(quote.membership.id) : "";
      const planId = quote.plan ? String(quote.plan.id) : "";

      const afterMember = Math.max(0, quote.subtotal - quote.membershipDiscount - quote.otherDiscount);
      const maxPts = quote.rule.rupeesPerPoint > 0 ? Math.floor(Math.max(afterMember - quote.rewardDiscount, 0) / quote.rule.rupeesPerPoint) : 0;
      const redeem = Math.max(0, Math.min(pointsRedeemed, Number(customer["points"] ?? 0), maxPts));

      const stockErr = stock.assertCanIssue(lines);
      if (stockErr) return { invoice: null, quote, earned: 0, pointsAfter: Number(customer["points"] ?? 0), error: stockErr };

      const invoice: Row = {
        id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: String(customer.id),
        customer: String(customer["name"] ?? ""),
        customerPhone: String(customer["phone"] ?? ""),
        membershipId,
        outlet,
        date: today,
        items: lines.map((l) => `${l.name} x${l.qty}`).join(", "),
        subtotal: Math.round(quote.subtotal),
        discount: Math.round(quote.otherDiscount),
        membershipDiscount: Math.round(quote.membershipDiscount),
        rewardDiscount: Math.round(quote.rewardDiscount),
        wheelSpinId: rewards?.wheelSpinId ?? "",
        offerRedemptionId: rewards?.offerRedemptionId ?? "",
        partnerCouponId: rewards?.partnerCouponId ?? "",
        pointsRedeemed: redeem,
        pointsValue: Math.round(quote.loyaltyValue),
        pointsEarned: quote.pointsToEarn,
        gstRate: lines[0]?.gstRate ?? 18,
        tax: Math.round(quote.tax),
        total: Math.round(quote.total),
        payment,
        appointment: appointmentId ?? "",
        appointmentId: appointmentId ?? "",
        status: "Paid",
        locationId: effLocation,
      };
      create("invoices", invoice);

      const store = { db: allRows, create, update };
      for (const line of quote.rewardLines) {
        if (line.label.startsWith("Wheel") && rewards?.wheelSpinId) {
          redeemWheelSpinAtPos(store, {
            spinId: rewards.wheelSpinId,
            invoiceId: String(invoice.id),
            discountAmount: line.amount,
          });
        }
        if (line.label.startsWith("Offer") && rewards?.offerRedemptionId) {
          redeemOfferAtPos(store, {
            redemptionId: rewards.offerRedemptionId,
            invoiceId: String(invoice.id),
            discountAmount: line.amount,
            orgId: org.orgId,
          });
        }
        if (line.label.startsWith("Partner") && rewards?.partnerCouponId) {
          redeemPartnerCouponAtPos(store, {
            couponId: rewards.partnerCouponId,
            invoiceId: String(invoice.id),
            discountAmount: line.amount,
            orgId: org.orgId,
          });
        }
      }

      stock.issueForCustomer(lines, {
        customerId: String(customer.id),
        invoiceId: String(invoice.id),
        locationId: effLocation,
        date: today,
      });

      for (const line of lines.filter((l) => l.staffId || l.staff)) {
        const person = (allRows["staff"] ?? []).find(
          (s) => String(s.id) === line.staffId || String(s["name"]) === line.staff,
        );
        const staffId = String(person?.id ?? line.staffId ?? "");
        const rate = Number(person?.["commissionRate"] ?? line.commission);
        const base = line.price * line.qty;
        create("commissions", {
          id: `CM-${Math.floor(10000 + Math.random() * 89999)}`,
          staffId,
          invoiceId: String(invoice.id),
          serviceId: line.kind === "service" ? line.id : "",
          item: line.name,
          type: line.kind === "service" ? "Service" : "Product",
          baseAmount: base,
          rate,
          amount: Math.round((base * rate) / 100),
          date: today,
          status: "Open",
          locationId: effLocation,
        });
      }

      for (const use of quote.benefit.usages) {
        create(MEMBERSHIP_USAGE, {
          id: `MU-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 99)}`,
          customerId: String(customer.id),
          membershipId,
          planId,
          invoiceId: String(invoice.id),
          serviceId: use.serviceId,
          serviceName: use.serviceName,
          quantity: use.quantity,
          type: use.type,
          status: "Used",
          usedOn: today,
          locationId: effLocation,
        });
      }
      if (quote.membership && quote.benefit.includedQty > 0) {
        update("memberships", String(quote.membership.id), {
          ...quote.membership,
          used: Number(quote.membership["used"] ?? 0) + quote.benefit.includedQty,
        });
      }

      let running = Number(customer["points"] ?? 0);
      if (redeem > 0) {
        const redeemed = postLoyaltyTransaction(store, {
          customerId: String(customer.id),
          type: "Redeem",
          points: redeem,
          source: "invoice",
          referenceId: String(invoice.id),
          programId: quote.rule.programId,
          locationId: effLocation,
          reason: "POS redemption",
          orgId: org.orgId,
        });
        if (redeemed.ok) running = redeemed.balanceAfter;
      }
      if (quote.pointsToEarn > 0) {
        const earned = postLoyaltyTransaction(store, {
          customerId: String(customer.id),
          type: "Earn",
          points: quote.pointsToEarn,
          source: "invoice",
          referenceId: String(invoice.id),
          programId: quote.rule.programId,
          locationId: effLocation,
          expiresOn: addExpiry(today, quote.rule.expiryMonths),
          reason: "POS purchase",
          orgId: org.orgId,
        });
        if (earned.ok) running = earned.balanceAfter;
      }

      const visitCount = Number(customer["totalVisits"] ?? customer["visits"] ?? 0) + 1;
      update("customers", String(customer.id), {
        ...customer,
        lastVisit: today,
        totalVisits: visitCount,
        visits: visitCount,
        lifetimeValue: Number(customer["lifetimeValue"] ?? 0) + Math.round(quote.total),
      });

      if (appointmentId) {
        const appt = (db["appointments"] ?? []).find((a) => String(a.id) === appointmentId);
        if (appt) update("appointments", appointmentId, { ...appt, status: "Completed", invoice: String(invoice.id) });
      }

      create(AUDIT, {
        id: `AU-${Date.now()}`,
        at: stamp,
        entity: "Invoice",
        reference: String(invoice.id),
        action: "Bill generated",
        detail: `${String(customer.id)} · ₹${Math.round(quote.total)} · ${payment} · ${redeem} pts out · +${quote.pointsToEarn} pts`,
        locationId: effLocation,
      });

      return { invoice, quote, earned: quote.pointsToEarn, pointsAfter: running };
    },
    [db, allRows, create, update, org, location, locationId, stock],
  );
}

/** Refund a paid invoice — reverses loyalty and marks invoice refunded (audit trail preserved). */
export function postInvoiceRefund(
  store: { db: Record<string, Row[]>; create: (c: string, r: Row, o?: string) => void; update: (c: string, id: string, r: Row) => void },
  input: { invoiceId: string; orgId: string; reason?: string },
) {
  const invoice = (store.db["invoices"] ?? []).find((i) => String(i.id) === input.invoiceId);
  if (!invoice) return { ok: false, error: "Invoice not found" };
  if (String(invoice["status"]) === "Refunded") return { ok: false, duplicate: true, error: "Already refunded" };

  const customerId = String(invoice["customerId"] ?? "");
  const locationId = String(invoice["locationId"] ?? "");
  postLoyaltyReversal(store, {
    customerId,
    originalSource: "invoice",
    originalReferenceId: input.invoiceId,
    orgId: input.orgId,
    locationId,
    reason: input.reason ?? `Refund · ${input.invoiceId}`,
  });

  store.update("invoices", input.invoiceId, { ...invoice, status: "Refunded" });
  store.create(AUDIT, {
    id: `AU-${Date.now()}`,
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    entity: "Invoice",
    reference: input.invoiceId,
    action: "Refunded",
    detail: input.reason ?? "Invoice refunded — loyalty reversed",
    locationId,
  });

  return { ok: true };
}
