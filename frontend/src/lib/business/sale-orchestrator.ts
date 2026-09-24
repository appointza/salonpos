import type { EntityId } from "@/lib/ids";
import type { BillLine } from "@/lib/pos";
import { AUDIT, MEMBERSHIP_USAGE } from "@/lib/pos";
import { addExpiry, postLoyaltyTransaction } from "@/lib/loyalty/loyalty-service";
import { redeemOfferAtPos } from "@/lib/offers/offer-redemption-service";
import { redeemPartnerCouponAtPos } from "@/lib/partners/partner-coupon-service";
import { redeemScratchPlayAtPos } from "@/lib/scratch/scratch-service";
import { redeemWheelSpinAtPos } from "@/lib/wheel/wheel-service";
import { claimCouponsAtPos } from "@/lib/coupons/coupon-pos";
import { quoteUnifiedSale } from "@/lib/business/discount-engine";
import { emitBusinessEvent } from "@/lib/business/event-bus";
import type { BusinessStore, SaleCommand, SaleResult, TenantCtx } from "@/lib/business/types";
import { completeAppointment } from "@/lib/business/appointment-service";

export type StockOps = {
  assertCanIssue: (lines: BillLine[]) => string | null;
  issueForCustomer: (
    lines: BillLine[],
    ctx: { customerId: EntityId; invoiceId: EntityId; locationId: EntityId; date: string },
  ) => unknown;
};

/** Central POS sale — one business event updates loyalty, stock, commissions, appointments, coupons. */
export function completeSale(
  store: BusinessStore,
  input: SaleCommand,
  tenant: TenantCtx,
  stock: StockOps,
): SaleResult {
  const { customer, lines, discount, pointsRedeemed, payment, appointmentId, rewards, couponCodes } = input;
  const quote = quoteUnifiedSale(
    { customer, lines, discount, pointsRedeemed, rewards, couponCodes, paymentMethod: payment },
    store.db,
    { orgId: tenant.orgId, locationId: tenant.locationId },
  );

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const today = stamp.slice(0, 10);
  const effLocation =
    tenant.locationId === "all"
      ? String(customer["locationId"] ?? tenant.locationId)
      : tenant.locationId;
  const membershipId = quote.membership ? String(quote.membership.id) : "";
  const planId = quote.plan ? String(quote.plan.id) : "";

  const afterMember = Math.max(0, quote.subtotal - quote.membershipDiscount - quote.otherDiscount);
  const maxPts =
    quote.rule.rupeesPerPoint > 0
      ? Math.floor(Math.max(afterMember - quote.rewardDiscount - quote.couponDiscount, 0) / quote.rule.rupeesPerPoint)
      : 0;
  const redeem = Math.max(0, Math.min(pointsRedeemed, Number(customer["points"] ?? 0), maxPts));

  const stockErr = stock.assertCanIssue(lines);
  if (stockErr) {
    return { invoice: null, quote, earned: 0, pointsAfter: Number(customer["points"] ?? 0), error: stockErr };
  }

  const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const invoice = {
    id: invoiceId,
    customerId: String(customer.id),
    customer: String(customer["name"] ?? ""),
    customerPhone: String(customer["phone"] ?? ""),
    membershipId,
    outlet: tenant.outletName,
    date: today,
    items: lines.map((l) => `${l.name} x${l.qty}`).join(", "),
    subtotal: Math.round(quote.subtotal),
    discount: Math.round(quote.otherDiscount),
    membershipDiscount: Math.round(quote.membershipDiscount),
    rewardDiscount: Math.round(quote.rewardDiscount),
    couponDiscount: Math.round(quote.couponDiscount),
    couponCodes: (couponCodes ?? []).join(", "),
    wheelSpinId: rewards?.wheelSpinId ?? "",
    scratchPlayId: rewards?.scratchPlayId ?? "",
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
    orgId: tenant.orgId,
  };
  store.create("invoices", invoice);

  for (const line of quote.rewardLines) {
    if (line.label.startsWith("Wheel") && rewards?.wheelSpinId) {
      redeemWheelSpinAtPos(store, {
        spinId: rewards.wheelSpinId,
        invoiceId,
        discountAmount: line.amount,
      });
    }
    if (line.label.startsWith("Scratch") && rewards?.scratchPlayId) {
      redeemScratchPlayAtPos(store, {
        playId: rewards.scratchPlayId,
        invoiceId,
        discountAmount: line.amount,
      });
    }
    if (line.label.startsWith("Offer") && rewards?.offerRedemptionId) {
      redeemOfferAtPos(store, {
        redemptionId: rewards.offerRedemptionId,
        invoiceId,
        discountAmount: line.amount,
        orgId: tenant.orgId,
      });
    }
    if (line.label.startsWith("Partner") && rewards?.partnerCouponId) {
      redeemPartnerCouponAtPos(store, {
        couponId: rewards.partnerCouponId,
        invoiceId,
        discountAmount: line.amount,
        orgId: tenant.orgId,
      });
    }
  }

  if (quote.couponLines.length) {
    const staffLine = lines.find((l) => l.staffId || l.staff);
    claimCouponsAtPos(store, {
      lines: quote.couponLines,
      invoiceId,
      orgId: tenant.orgId,
      locationId: effLocation,
      customerId: String(customer.id),
      staffId: staffLine?.staffId,
      staff: staffLine?.staff,
    });
  }

  stock.issueForCustomer(lines, {
    customerId: String(customer.id),
    invoiceId,
    locationId: effLocation,
    date: today,
  });

  emitBusinessEvent(store, {
    type: "STOCK_CONSUMED",
    orgId: tenant.orgId,
    locationId: effLocation,
    at: stamp,
    entityId: invoiceId,
    customerId: String(customer.id),
    payload: { lineCount: lines.length },
  });

  for (const line of lines.filter((l) => l.staffId || l.staff)) {
    const person = (store.db["staff"] ?? []).find(
      (s) => String(s.id) === line.staffId || String(s["name"]) === line.staff,
    );
    const staffId = String(person?.id ?? line.staffId ?? "");
    const rate = Number(person?.["commissionRate"] ?? line.commission);
    const base = line.price * line.qty;
    store.create("commissions", {
      id: `CM-${Math.floor(10000 + Math.random() * 89999)}`,
      staffId,
      invoiceId,
      serviceId: line.kind === "service" ? line.id : "",
      item: line.name,
      type: line.kind === "service" ? "Service" : "Product",
      baseAmount: base,
      rate,
      amount: Math.round((base * rate) / 100),
      date: today,
      status: "Open",
      locationId: effLocation,
      orgId: tenant.orgId,
    });
  }

  for (const use of quote.benefit.usages) {
    store.create(MEMBERSHIP_USAGE, {
      id: `MU-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 99)}`,
      customerId: String(customer.id),
      membershipId,
      planId,
      invoiceId,
      serviceId: use.serviceId,
      serviceName: use.serviceName,
      quantity: use.quantity,
      type: use.type,
      status: "Used",
      usedOn: today,
      locationId: effLocation,
      orgId: tenant.orgId,
    });
  }
  if (quote.membership && quote.benefit.includedQty > 0) {
    store.update("memberships", String(quote.membership.id), {
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
      referenceId: invoiceId,
      programId: quote.rule.programId,
      locationId: effLocation,
      reason: "POS redemption",
      orgId: tenant.orgId,
    });
    if (redeemed.ok) {
      running = redeemed.balanceAfter;
      emitBusinessEvent(store, {
        type: "LOYALTY_REDEEMED",
        orgId: tenant.orgId,
        locationId: effLocation,
        at: stamp,
        entityId: invoiceId,
        customerId: String(customer.id),
        payload: { points: redeem },
      });
    }
  }
  if (quote.pointsToEarn > 0) {
    const earned = postLoyaltyTransaction(store, {
      customerId: String(customer.id),
      type: "Earn",
      points: quote.pointsToEarn,
      source: "invoice",
      referenceId: invoiceId,
      programId: quote.rule.programId,
      locationId: effLocation,
      expiresOn: addExpiry(today, quote.rule.expiryMonths),
      reason: "POS purchase",
      orgId: tenant.orgId,
    });
    if (earned.ok) {
      running = earned.balanceAfter;
      emitBusinessEvent(store, {
        type: "LOYALTY_EARNED",
        orgId: tenant.orgId,
        locationId: effLocation,
        at: stamp,
        entityId: invoiceId,
        customerId: String(customer.id),
        payload: { points: quote.pointsToEarn },
      });
    }
  }

  const visitCount = Number(customer["totalVisits"] ?? customer["visits"] ?? 0) + 1;
  store.update("customers", String(customer.id), {
    ...customer,
    lastVisit: today,
    totalVisits: visitCount,
    visits: visitCount,
    lifetimeValue: Number(customer["lifetimeValue"] ?? 0) + Math.round(quote.total),
  });

  if (appointmentId) {
    completeAppointment(store, {
      appointmentId,
      invoiceId,
      orgId: tenant.orgId,
      locationId: effLocation,
    });
  }

  store.create(AUDIT, {
    id: `AU-${Date.now()}`,
    at: stamp,
    entity: "Invoice",
    reference: invoiceId,
    action: "Bill generated",
    detail: `${String(customer.id)} · ₹${Math.round(quote.total)} · ${payment} · ${redeem} pts out · +${quote.pointsToEarn} pts`,
    locationId: effLocation,
    orgId: tenant.orgId,
  });

  emitBusinessEvent(store, {
    type: "SALE_COMPLETED",
    orgId: tenant.orgId,
    locationId: effLocation,
    at: stamp,
    entityId: invoiceId,
    customerId: String(customer.id),
    payload: { total: Math.round(quote.total), earned: quote.pointsToEarn },
  });

  return { invoice, quote, earned: quote.pointsToEarn, pointsAfter: running };
}
