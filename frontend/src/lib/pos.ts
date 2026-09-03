import { useCallback } from "react";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { addExpiry, earnPoints, pointsToRupees, resolveLoyaltyRule, type LoyaltyRule } from "@/lib/loyalty-rules";
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
};

export type CartQuote = {
  subtotal: number;
  membershipDiscount: number;
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

export function billTotals(lines: BillLine[], discount: number, membershipDiscount: number, pointsValue: number) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const deductions = Math.min(discount + membershipDiscount + pointsValue, subtotal);
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
  const maxPts = rule.rupeesPerPoint > 0 ? Math.floor(afterMember / rule.rupeesPerPoint) : 0;
  const available = Number(input.customer?.["points"] ?? 0);
  const redeem = Math.max(0, Math.min(input.pointsRedeemed, available, maxPts));
  const loyaltyValue = pointsToRupees(redeem, rule);
  const t = billTotals(input.lines, otherDiscount, benefit.amount, loyaltyValue);
  const pointsToEarn = earnPoints(t.taxable, rule);
  return {
    subtotal: t.subtotal,
    membershipDiscount: benefit.amount,
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
export const LOYALTY_TX = "loyaltyTransactions";
export const MEMBERSHIP_USAGE = "membershipUsage";

export function usePostSale() {
  const { db, allRows, create, update } = useData();
  const { org, location, locationId } = useTenant();
  const stock = useStockService();

  return useCallback(
    (input: SaleInput) => {
      const { customer, lines, discount, pointsRedeemed, payment, appointmentId } = input;
      const quote = quoteSale(
        { customer, lines, discount, pointsRedeemed },
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
      const maxPts = quote.rule.rupeesPerPoint > 0 ? Math.floor(afterMember / quote.rule.rupeesPerPoint) : 0;
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
        pointsRedeemed: redeem,
        pointsValue: Math.round(quote.loyaltyValue),
        pointsEarned: quote.pointsToEarn,
        gstRate: lines[0]?.gstRate ?? 18,
        tax: Math.round(quote.tax),
        total: Math.round(quote.total),
        payment,
        appointment: appointmentId ?? "",
        status: "Paid",
        locationId: effLocation,
      };
      create("invoices", invoice);

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

      const before = Number(customer["points"] ?? 0);
      let running = before;
      if (redeem > 0) {
        const afterRedeem = running - redeem;
        create(LOYALTY_TX, {
          id: `LT-${Date.now().toString().slice(-8)}r`,
          customerId: String(customer.id),
          invoiceId: String(invoice.id),
          programId: quote.rule.programId,
          type: "Redeem",
          points: redeem,
          balanceBefore: running,
          balanceAfter: afterRedeem,
          reason: "POS redemption",
          status: "Posted",
          locationId: effLocation,
        });
        running = afterRedeem;
      }
      if (quote.pointsToEarn > 0) {
        const afterEarn = running + quote.pointsToEarn;
        create(LOYALTY_TX, {
          id: `LT-${Date.now().toString().slice(-8)}e`,
          customerId: String(customer.id),
          invoiceId: String(invoice.id),
          programId: quote.rule.programId,
          type: "Earn",
          points: quote.pointsToEarn,
          balanceBefore: running,
          balanceAfter: afterEarn,
          reason: "POS purchase",
          expiresOn: addExpiry(today, quote.rule.expiryMonths),
          status: "Posted",
          locationId: effLocation,
        });
        running = afterEarn;
      }

      update("customers", String(customer.id), {
        ...customer,
        points: running,
        lastVisit: today,
        visits: Number(customer["visits"] ?? 0) + 1,
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
