import { useCallback, useEffect, useState } from "react";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import type { LoyaltyRule } from "@/lib/loyalty-rules";
import type { RewardRefs } from "@/lib/rewards/reward-quote";
import type { MembershipBenefit } from "@/lib/membership";
import type { AppliedCouponLine } from "@/lib/coupons/coupon-pos";
import { useStockService } from "@/lib/stock";
import { quoteUnifiedSale } from "@/lib/business/discount-engine";
import { registerBusinessHandlers } from "@/lib/business/handlers";
import { invoiceService } from "@/services/invoice.service";
import type { InvoiceBillLine, InvoiceCompleteSaleReq, InvoiceQuoteReq } from "@/model/invoices";
import type { EntityId } from "@/lib/ids";
import { idNum } from "@/lib/ids";

export type BillLine = {
  id: string;
  kind: "service" | "product";
  name: string;
  price: number;
  gstRate: number;
  qty: number;
  commission: number;
  staff: string;
  staffId: EntityId;
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

export function toApiId(v: EntityId | undefined | null): number {
  return idNum(v);
}

function toApiLines(lines: BillLine[]): InvoiceBillLine[] {
  return lines.map((l) => ({
    id: toApiId(l.id),
    kind: l.kind,
    name: l.name,
    price: l.price,
    gstRate: l.gstRate,
    qty: l.qty,
    commission: l.commission,
    staff: l.staff,
    staffId: toApiId(l.staffId),
  }));
}

function toQuoteReq(
  input: {
    customer: Row;
    lines: BillLine[];
    discount: number;
    pointsRedeemed: number;
    payment: string;
    rewards?: RewardRefs;
    couponCodes?: string[];
    appointmentId?: string;
  },
  ctx: { orgId: EntityId; locationId: EntityId | "all"; outletName: string },
): InvoiceCompleteSaleReq {
  return {
    orgId: toApiId(ctx.orgId),
    locationId: toApiId(ctx.locationId),
    customerId: toApiId(input.customer.id),
    lines: toApiLines(input.lines),
    discount: input.discount,
    pointsRedeemed: input.pointsRedeemed,
    payment: input.payment,
    rewards: {
      wheelSpinId: toApiId(input.rewards?.wheelSpinId),
      offerRedemptionId: toApiId(input.rewards?.offerRedemptionId),
      partnerCouponId: toApiId(input.rewards?.partnerCouponId),
    },
    couponCodes: input.couponCodes ?? [],
    outletName: ctx.outletName,
    appointmentId: toApiId(input.appointmentId),
  };
}

function mergeQuote(api: Awaited<ReturnType<typeof invoiceService.quote>>, local: CartQuote): CartQuote {
  if (api.errorMessage) return local;
  return {
    ...local,
    subtotal: api.subtotal,
    membershipDiscount: api.membershipDiscount,
    rewardDiscount: api.rewardDiscount,
    rewardLines: api.rewardLines ?? [],
    couponDiscount: api.couponDiscount,
    otherDiscount: api.otherDiscount,
    loyaltyValue: api.loyaltyValue,
    taxable: api.taxable,
    tax: api.tax,
    total: api.total,
    pointsToEarn: api.pointsToEarn,
    rule: {
      ...local.rule,
      rupeesPerPoint: api.rupeesPerPoint > 0 ? api.rupeesPerPoint : local.rule.rupeesPerPoint,
    },
  };
}

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
  ctx: { orgId: EntityId; locationId: EntityId | "all" },
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

export function useSaleQuote(
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
  ctx: { orgId: EntityId; locationId: EntityId | "all" },
) {
  const localQuote = quoteSale(input, db, ctx);
  const [quote, setQuote] = useState<CartQuote>(localQuote);
  const [loading, setLoading] = useState(false);

  const linesKey = JSON.stringify(input.lines);
  const rewardsKey = JSON.stringify(input.rewards ?? {});
  const couponsKey = JSON.stringify(input.couponCodes ?? []);

  useEffect(() => {
    const local = quoteSale(input, db, ctx);
    setQuote(local);
    if (!input.customer || input.lines.length === 0) return;

    const req: InvoiceQuoteReq = {
      orgId: toApiId(ctx.orgId),
      locationId: toApiId(ctx.locationId),
      customerId: toApiId(input.customer.id),
      lines: toApiLines(input.lines),
      discount: input.discount,
      pointsRedeemed: input.pointsRedeemed,
      payment: input.paymentMethod ?? "",
      rewards: {
        wheelSpinId: toApiId(input.rewards?.wheelSpinId),
        offerRedemptionId: toApiId(input.rewards?.offerRedemptionId),
        partnerCouponId: toApiId(input.rewards?.partnerCouponId),
      },
      couponCodes: input.couponCodes ?? [],
      outletName: "",
    };

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const apiQuote = await invoiceService.quote(req);
        setQuote(mergeQuote(apiQuote, local));
      } catch {
        setQuote(local);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    input.customer?.id,
    linesKey,
    input.discount,
    input.pointsRedeemed,
    rewardsKey,
    couponsKey,
    input.paymentMethod,
    input.staffId,
    ctx.orgId,
    ctx.locationId,
    db,
  ]);

  return { quote, loading };
}

export const AUDIT = "auditLog";
export const MEMBERSHIP_USAGE = "membershipUsage";

export function usePostSale() {
  const { allRows, create, update, applyCache, orgId, reload } = useData();
  const { org, location, locationId } = useTenant();
  const stock = useStockService();

  useEffect(() => {
    registerBusinessHandlers();
  }, []);

  return useCallback(
    async (input: SaleInput) => {
      const tenant = {
        orgId: org.orgId,
        locationId,
        outletName: location?.name ?? String(input.customer["outlet"] ?? "All"),
      };

      const stockErr = await stock.assertCanIssue(input.lines);
      if (stockErr) {
        const quote = quoteSale(input, allRows, tenant);
        return {
          invoice: null,
          quote,
          earned: 0,
          pointsAfter: Number(input.customer["points"] ?? 0),
          error: stockErr,
        };
      }

      try {
        const res = await invoiceService.completeSale(toQuoteReq(input, tenant));
        if (res.errorMessage) {
          const quote = quoteSale(input, allRows, tenant);
          return {
            invoice: null,
            quote,
            earned: 0,
            pointsAfter: Number(input.customer["points"] ?? 0),
            error: res.errorMessage,
          };
        }

        const quote = mergeQuote(res.quote, quoteSale(input, allRows, tenant));
        const invoice: Row = {
          id: String(res.invoice.id),
          orgId: String(res.invoice.orgId || orgId),
          customerId: String(res.invoice.customerId),
          customer: res.invoice.customer,
          membershipId: String(res.invoice.membershipId ?? ""),
          outlet: res.invoice.outlet,
          date: res.invoice.date,
          items: res.invoice.items,
          subtotal: res.invoice.subtotal,
          discount: res.invoice.discount,
          gstRate: res.invoice.gstRate,
          tax: res.invoice.tax,
          total: res.invoice.total,
          payment: res.invoice.payment,
          status: res.invoice.status,
          locationId: String(res.invoice.locationId),
          pointsEarned: res.pointsEarned,
          pointsRedeemed: quote.loyaltyValue > 0 ? input.pointsRedeemed : 0,
        };

        const customerId = String(input.customer.id);
        const visitDate = String(res.invoice.date ?? "").slice(0, 10);
        applyCache((prev) => ({
          ...prev,
          invoices: [invoice, ...(prev["invoices"] ?? [])],
          customers: (prev["customers"] ?? []).map((c) =>
            String(c.id) === customerId
              ? {
                  ...c,
                  points: res.pointsAfter,
                  lastVisit: visitDate || c["lastVisit"],
                  totalVisits: Number(c["totalVisits"] ?? 0) + 1,
                }
              : c,
          ),
        }));
        await stock.refreshRemaining();
        await reload();

        return {
          invoice,
          quote,
          earned: res.pointsEarned,
          pointsAfter: res.pointsAfter,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Checkout failed";
        const quote = quoteSale(input, allRows, tenant);
        return {
          invoice: null,
          quote,
          earned: 0,
          pointsAfter: Number(input.customer["points"] ?? 0),
          error: msg,
        };
      }
    },
    [allRows, create, update, applyCache, orgId, org.orgId, location, locationId, stock, reload],
  );
}

/** Refund a paid invoice — reverses loyalty and marks invoice refunded. */
export async function postInvoiceRefund(
  store: { db: Record<string, Row[]>; create: (c: string, r: Row, o?: string) => void; update: (c: string, id: string, r: Row) => void },
  input: { invoiceId: EntityId; orgId: EntityId; reason?: string },
) {
  try {
    const res = await invoiceService.refund({
      id: toApiId(input.invoiceId),
      orgId: toApiId(input.orgId),
      reason: input.reason ?? "",
    });
    if (res.success) return { ok: true };
    if (res.errorMessage) return { ok: false, error: res.errorMessage };
  } catch {
    /* fall through to local store */
  }

  const invoice = (store.db["invoices"] ?? []).find((i) => String(i.id) === input.invoiceId);
  if (!invoice) return { ok: false, error: "Invoice not found" };
  if (String(invoice["status"]) === "Refunded") return { ok: false, duplicate: true, error: "Already refunded" };

  store.update("invoices", input.invoiceId, { ...invoice, status: "Refunded" });
  store.create(AUDIT, {
    id: `AU-${Date.now()}`,
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    entity: "Invoice",
    reference: input.invoiceId,
    action: "Refunded",
    detail: input.reason ?? "Invoice refunded",
    locationId: String(invoice["locationId"] ?? ""),
  });

  return { ok: true };
}
