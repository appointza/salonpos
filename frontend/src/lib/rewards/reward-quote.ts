import type { Db, Row } from "@/lib/store";
import { offerDiscountAmount, QR_OFFERS } from "@/lib/offers/offer-redemption-service";
import { partnerCouponDiscount, PARTNERSHIPS } from "@/lib/partners/partner-coupon-service";
import { wheelSpinDiscountAmount, WHEEL_SPINS } from "@/lib/wheel/wheel-service";

export type RewardRefs = {
  wheelSpinId?: string;
  offerRedemptionId?: string;
  partnerCouponId?: string;
};

export type RewardDiscountLine = {
  key: string;
  label: string;
  amount: number;
  refId: string;
};

export function computeRewardDiscounts(db: Db, refs: RewardRefs, subtotal: number): {
  total: number;
  lines: RewardDiscountLine[];
} {
  const lines: RewardDiscountLine[] = [];
  let remaining = subtotal;

  if (refs.wheelSpinId) {
    const spin = (db[WHEEL_SPINS] ?? []).find((s) => String(s.id) === refs.wheelSpinId);
    if (spin && String(spin["status"]) === "Pending") {
      const amount = Math.min(wheelSpinDiscountAmount(spin, remaining), remaining);
      if (amount > 0) {
        lines.push({ key: "wheel", label: `Wheel · ${String(spin["label"])}`, amount, refId: refs.wheelSpinId });
        remaining -= amount;
      }
    }
  }

  if (refs.offerRedemptionId) {
    const redemption = (db["qrOfferRedemptions"] ?? []).find((r) => String(r.id) === refs.offerRedemptionId);
    if (redemption && String(redemption["status"]) === "Issued") {
      const offer = (db[QR_OFFERS] ?? []).find((o) => String(o.id) === String(redemption["offerId"]));
      if (offer) {
        const amount = Math.min(offerDiscountAmount(offer, remaining), remaining);
        if (amount > 0) {
          lines.push({
            key: "offer",
            label: `Offer · ${String(offer["title"] ?? redemption["offerTitle"])}`,
            amount,
            refId: refs.offerRedemptionId,
          });
          remaining -= amount;
        }
      }
    }
  }

  if (refs.partnerCouponId) {
    const coupon = (db["partnerCoupons"] ?? []).find((c) => String(c.id) === refs.partnerCouponId);
    if (coupon && String(coupon["status"]) === "Issued") {
      const partner = (db[PARTNERSHIPS] ?? []).find((p) => String(p.id) === String(coupon["partnerId"]));
      const amount = Math.min(partnerCouponDiscount(coupon, partner ?? null, remaining), remaining);
      if (amount > 0) {
        lines.push({
          key: "partner",
          label: `Partner · ${String(partner?.["partnerName"] ?? coupon["couponCode"])}`,
          amount,
          refId: refs.partnerCouponId,
        });
      }
    }
  }

  return { total: lines.reduce((s, l) => s + l.amount, 0), lines };
}

export function getCustomerRewardOptions(db: Db, customerId: string) {
  const wheelSpins = (db[WHEEL_SPINS] ?? []).filter(
    (s) => String(s["customerId"]) === customerId && String(s["status"]) === "Pending",
  );
  const offers = (db["qrOfferRedemptions"] ?? []).filter(
    (r) => String(r["customerId"]) === customerId && String(r["status"]) === "Issued",
  );
  const partners = (db["partnerCoupons"] ?? []).filter(
    (c) => String(c["customerId"]) === customerId && String(c["status"]) === "Issued",
  );
  return { wheelSpins, offers, partners };
}
