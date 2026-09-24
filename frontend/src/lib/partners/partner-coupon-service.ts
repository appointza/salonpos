import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import type { LoyaltyStore } from "@/lib/loyalty/loyalty-service";

export const PARTNER_COUPONS = "partnerCoupons";
export const PARTNERSHIPS = "partnerships";

export type PartnerStore = LoyaltyStore;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseFlatAmount(text: string) {
  const match = String(text).match(/₹\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function partnerCouponDiscount(coupon: Row, partnership: Row | null, subtotal: number) {
  const offer = String(coupon["offer"] ?? coupon["direction"] === "inbound" ? partnership?.["inboundOffer"] : partnership?.["outboundOffer"] ?? "");
  const hay = offer.toLowerCase();
  if (hay.includes("%")) {
    const match = hay.match(/(\d+)\s*%/);
    const pct = match ? Number(match[1]) : 10;
    return Math.round(subtotal * (pct / 100));
  }
  const flat = parseFlatAmount(offer);
  return flat > 0 ? flat : Math.min(200, subtotal);
}

export function issuePartnerCoupon(
  store: PartnerStore,
  input: {
    partnerId: string;
    customerId: EntityId;
    direction: "inbound" | "outbound";
    locationId: EntityId;
    orgId: EntityId;
    offer?: string;
  },
) {
  const partner = (store.db[PARTNERSHIPS] ?? []).find((p) => String(p.id) === input.partnerId);
  if (!partner) return { ok: false, error: "Partner not found" };

  const offer =
    input.offer ??
    (input.direction === "inbound" ? String(partner["inboundOffer"]) : String(partner["outboundOffer"]));
  const code = `PC-${Math.floor(1000 + Math.random() * 9000)}`;
  const row: Row = {
    id: `PC-${Date.now().toString().slice(-8)}`,
    partnerId: input.partnerId,
    orgId: input.orgId,
    locationId: input.locationId,
    customerId: input.customerId,
    direction: input.direction,
    offer,
    couponCode: code,
    status: "Issued",
    issuedAt: today(),
    redeemedAt: "",
    invoiceId: "",
  };
  store.create(PARTNER_COUPONS, row, input.orgId);

  const field = input.direction === "inbound" ? "issued" : "issued";
  store.update(PARTNERSHIPS, input.partnerId, {
    ...partner,
    [field]: Number(partner[field] ?? 0) + 1,
  });

  return { ok: true, coupon: row };
}

export function getPendingPartnerCoupons(db: Db, customerId: EntityId, direction: "inbound" = "inbound") {
  return (db[PARTNER_COUPONS] ?? []).filter(
    (c) =>
      String(c["customerId"]) === customerId &&
      String(c["direction"]) === direction &&
      String(c["status"]) === "Issued",
  );
}

export function redeemPartnerCouponAtPos(
  store: PartnerStore,
  input: { couponId: EntityId; invoiceId: EntityId; discountAmount: number; orgId?: EntityId },
) {
  const coupon = (store.db[PARTNER_COUPONS] ?? []).find((c) => String(c.id) === input.couponId);
  if (!coupon) return { ok: false, error: "Partner coupon not found" };
  if (String(coupon["status"]) !== "Issued") return { ok: false, duplicate: true, error: "Coupon already used" };

  store.update(PARTNER_COUPONS, input.couponId, {
    ...coupon,
    status: "Redeemed",
    invoiceId: input.invoiceId,
    redeemedAt: today(),
    discountAmount: input.discountAmount,
  });

  const partner = (store.db[PARTNERSHIPS] ?? []).find((p) => String(p.id) === String(coupon["partnerId"]));
  if (partner) {
    store.update(PARTNERSHIPS, String(partner.id), {
      ...partner,
      redeemed: Number(partner["redeemed"] ?? 0) + 1,
    });
  }

  return { ok: true };
}
