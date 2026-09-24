import { normalizePhone } from "@/lib/customers/customer-lookup";
import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import { offerDiscountAmount, QR_OFFERS } from "@/lib/offers/offer-redemption-service";
import { partnerCouponDiscount, PARTNERSHIPS } from "@/lib/partners/partner-coupon-service";
import { scratchPlayDiscountAmount, SCRATCH_PLAYS } from "@/lib/scratch/scratch-service";
import { wheelSpinDiscountAmount, WHEEL_SPINS } from "@/lib/wheel/wheel-service";

export type RewardRefs = {
  wheelSpinId?: string;
  scratchPlayId?: string;
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
      const claimable = amount > 0 || isClaimWithoutAmount(String(spin["rewardType"] ?? ""));
      if (claimable) {
        lines.push({ key: "wheel", label: `Wheel · ${String(spin["label"])}`, amount, refId: refs.wheelSpinId });
        remaining -= amount;
      }
    }
  }

  if (refs.scratchPlayId) {
    const play = (db[SCRATCH_PLAYS] ?? []).find((s) => String(s.id) === refs.scratchPlayId);
    if (play && String(play["status"]) === "Pending") {
      const amount = Math.min(scratchPlayDiscountAmount(play, remaining), remaining);
      const claimable = amount > 0 || isClaimWithoutAmount(String(play["rewardType"] ?? ""));
      if (claimable) {
        lines.push({ key: "scratch", label: `Scratch · ${String(play["label"])}`, amount, refId: refs.scratchPlayId });
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

function isClaimWithoutAmount(prizeType: string) {
  return prizeType === "Free service" || prizeType === "Partner offer" || prizeType === "Free item";
}

/** Same phone can sit on more than one customer row. Prizes belong to any of those ids. */
export function rewardCustomerIds(db: Db, customer: Row) {
  const ids = new Set<string>([String(customer.id)]);
  const phone = normalizePhone(String(customer["phone"] ?? ""));
  if (phone.length < 10) return ids;
  for (const row of db["customers"] ?? []) {
    if (String(row["orgId"]) !== String(customer["orgId"] ?? "")) continue;
    if (normalizePhone(String(row["phone"] ?? "")) === phone) ids.add(String(row.id));
  }
  return ids;
}

export function getCustomerRewardOptions(db: Db, customerId: EntityId, alsoIds?: Iterable<string>) {
  const ids = new Set([String(customerId), ...(alsoIds ?? [])]);
  const owned = (row: Row) => ids.has(String(row["customerId"] ?? ""));
  const wheelSpins = (db[WHEEL_SPINS] ?? []).filter((s) => owned(s) && String(s["status"]) === "Pending");
  const scratchPlays = (db[SCRATCH_PLAYS] ?? []).filter((s) => owned(s) && String(s["status"]) === "Pending");
  const offers = (db["qrOfferRedemptions"] ?? []).filter((r) => owned(r) && String(r["status"]) === "Issued");
  const partners = (db["partnerCoupons"] ?? []).filter((c) => owned(c) && String(c["status"]) === "Issued");
  return { wheelSpins, scratchPlays, offers, partners };
}
