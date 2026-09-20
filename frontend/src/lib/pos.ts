import { useCallback, useEffect } from "react";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import type { LoyaltyRule } from "@/lib/loyalty-rules";
import { postLoyaltyReversal, LOYALTY_TX } from "@/lib/loyalty/loyalty-service";
import type { RewardRefs } from "@/lib/rewards/reward-quote";
import type { MembershipBenefit } from "@/lib/membership";
import type { AppliedCouponLine } from "@/lib/coupons/coupon-pos";
import { useStockService } from "@/lib/stock";
import { quoteUnifiedSale } from "@/lib/business/discount-engine";
import { completeSale } from "@/lib/business/sale-orchestrator";
import { registerBusinessHandlers } from "@/lib/business/handlers";

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
  couponCodes?: string[];
};

export type CartQuote = {
  subtotal: number;
  membershipDiscount: number;
  rewardDiscount: number;
  rewardLines: { label: string; amount: number }[];
  couponDiscount: number;
  couponLines: AppliedCouponLine[];
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
    couponCodes?: string[];
    paymentMethod?: string;
    staffId?: string;
  },
  db: Record<string, Row[]>,
  ctx: { orgId: string; locationId: string },
): CartQuote {
  return quoteUnifiedSale(
    {
      customer: input.customer,
      lines: input.lines,
      discount: input.discount,
      pointsRedeemed: input.pointsRedeemed,
      rewards: input.rewards,
      couponCodes: input.couponCodes,
      paymentMethod: input.paymentMethod,
      staffId: input.staffId,
    },
    db,
    ctx,
  );
}

export const AUDIT = "auditLog";
export { LOYALTY_TX };
export const MEMBERSHIP_USAGE = "membershipUsage";

export function usePostSale() {
  const { allRows, create, update } = useData();
  const { org, location, locationId } = useTenant();
  const stock = useStockService();

  useEffect(() => {
    registerBusinessHandlers();
  }, []);

  return useCallback(
    (input: SaleInput) =>
      completeSale(
        { db: allRows, create, update },
        input,
        {
          orgId: org.orgId,
          locationId,
          outletName: location?.name ?? String(input.customer["outlet"] ?? "All"),
        },
        stock,
      ),
    [allRows, create, update, org.orgId, location, locationId, stock],
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
