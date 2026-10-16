import type { EntityId } from "@/ids";
import { sameId } from "@/ids";
import type { Db, Row } from "@/store";
import { findCustomerByPhoneInOrg } from "@/pages/Customers/customer-lookup";
import { couponConditionsSummary, couponHeadline, listCouponDefinitions, type CouponRule } from "@/pages/Coupons/coupon-engine";
import { listCustomerVouchers } from "@/pages/Coupons/voucher-local";
import { listOffersForPublicGuest } from "@/pages/Offers/offer-redemption-service";
import { formatOfferValidityLabel } from "@/pages/Offers/offer-display";
import { offerValidityDaysFromDb } from "@/pages/PrizeWheel/reward-distribution";
import { getCustomerShopVisits, type CustomerShopVisit } from "@/pages/NearbyMyShops/customer-shops";
import { ensureCustomerReferralCode } from "@/pages/Loyalty/referral-service";
import { orgPublicSlug } from "@/pages/Loyalty/referral-share-url";

export type CustomerLocationOffer = {
  id: string;
  kind: "offer" | "coupon" | "mine";
  title: string;
  description: string;
  code: string;
  validityLabel: string;
  windowDays: number;
  daysLeft: number | null;
  row?: Row;
};

export type CustomerLocationOfferGroup = {
  key: string;
  orgId: EntityId;
  orgName: string;
  locationId: EntityId;
  locationName: string;
  city: string;
  address: string;
  prizeValidityDays: number;
  orgSlug: string;
  referralCode: string;
  live: CustomerLocationOffer[];
  mine: CustomerLocationOffer[];
};

function couponAtLocation(coupon: CouponRule, locationId: EntityId) {
  const loc = String(coupon.locationId ?? "");
  const allowed = coupon.eligibleLocationIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!loc || loc === "0" || Number(loc) === 0) {
    if (allowed.length === 0) return true;
    return allowed.some((id) => sameId(id, locationId));
  }
  if (sameId(loc, locationId)) return true;
  return allowed.some((id) => sameId(id, locationId));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function liveCouponToCard(coupon: CouponRule, fallbackDays: number): CustomerLocationOffer {
  const validity = formatOfferValidityLabel({
    validityStart: coupon.validityStart,
    validityEnd: coupon.validityEnd,
    fallbackDays,
  });
  return {
    id: `coupon-${coupon.id}`,
    kind: "coupon",
    title: couponHeadline(coupon),
    description: coupon.description || couponConditionsSummary(coupon),
    code: coupon.code,
    validityLabel: validity.label,
    windowDays: validity.windowDays,
    daysLeft: validity.daysLeft,
  };
}

export function listCustomerLocationOffers(
  db: Db,
  phone: string,
  extras: { orgId: EntityId; locationId: EntityId; orgName: string; locationName: string; city?: string; address?: string; orgSlug?: string }[],
): CustomerLocationOfferGroup[] {
  const shops = getCustomerShopVisits(db, phone);
  const byKey = new Map<string, CustomerShopVisit | (typeof extras)[number]>();
  for (const shop of shops) byKey.set(shop.key, shop);
  for (const extra of extras) {
    const key = `${extra.orgId}::${extra.locationId}`;
    if (!byKey.has(key)) byKey.set(key, extra);
  }

  const day = today();
  const groups: CustomerLocationOfferGroup[] = [];

  for (const loc of byKey.values()) {
    const orgId = loc.orgId;
    const locationId = loc.locationId;
    const prizeValidityDays = offerValidityDaysFromDb(db, orgId);
    const customer = findCustomerByPhoneInOrg(db["customers"] ?? [], phone, orgId, locationId);
    const liveOffers = listOffersForPublicGuest(db, {
      orgId,
      locationId,
      customer,
      treatAsNewGuest: !customer,
      onDate: day,
    });

    const live: CustomerLocationOffer[] = liveOffers.map((offer) => {
      const validity = formatOfferValidityLabel({
        validityStart: String(offer["validityStart"] ?? ""),
        validityEnd: String(offer["validityEnd"] ?? ""),
        fallbackDays: prizeValidityDays,
      });
      return {
        id: `offer-${String(offer.id)}`,
        kind: "offer",
        title: String(offer["title"] ?? "Offer"),
        description: String(offer["description"] ?? ""),
        code: String(offer["code"] ?? offer.id),
        validityLabel: validity.label,
        windowDays: validity.windowDays,
        daysLeft: validity.daysLeft,
        row: offer,
      };
    });

    const coupons = listCouponDefinitions(db, { orgId }).filter((c) => {
      if (c.status !== "Active") return false;
      if (c.validityStart && day < c.validityStart) return false;
      if (c.validityEnd && day > c.validityEnd) return false;
      return couponAtLocation(c, locationId);
    });
    for (const coupon of coupons) {
      if (live.some((o) => o.code && coupon.code && o.code.toLowerCase() === coupon.code.toLowerCase())) continue;
      live.push(liveCouponToCard(coupon, prizeValidityDays));
    }

    const mine: CustomerLocationOffer[] = [];
    const shop = "coupons" in loc ? loc : null;
    if (shop) {
      for (const c of shop.coupons) {
        const validity = formatOfferValidityLabel({ expiresAt: c.expiresAt, fallbackDays: prizeValidityDays });
        mine.push({
          id: `mine-${c.id}`,
          kind: "mine",
          title: c.title,
          description: c.valueLabel,
          code: "",
          validityLabel: validity.label,
          windowDays: validity.windowDays,
          daysLeft: validity.daysLeft,
        });
      }
    }
    if (customer) {
      for (const v of listCustomerVouchers(db, String(customer.id), orgId)) {
        const id = `voucher-${String(v.id)}`;
        if (mine.some((m) => m.id === id)) continue;
        const validity = formatOfferValidityLabel({
          expiresAt: String(v["expiresAt"] ?? v["validityEnd"] ?? ""),
          fallbackDays: prizeValidityDays,
        });
        mine.push({
          id,
          kind: "mine",
          title: String(v["schemeTitle"] ?? v["code"] ?? "Coupon"),
          description: String(v["code"] ?? ""),
          code: String(v["code"] ?? ""),
          validityLabel: validity.label,
          windowDays: validity.windowDays,
          daysLeft: validity.daysLeft,
        });
      }
    }

    if (live.length === 0 && mine.length === 0 && extras.every((e) => `${e.orgId}::${e.locationId}` !== `${orgId}::${locationId}`)) {
      continue;
    }

    const orgRow = (db["organizations"] ?? []).find((o) => String(o["orgId"]) === String(orgId));
    const orgSlug =
      ("orgSlug" in loc && loc.orgSlug ? String(loc.orgSlug) : "") ||
      orgPublicSlug(orgRow);
    const referralCode =
      (shop && shop.referralCode) || (customer ? ensureCustomerReferralCode(customer) : "");

    groups.push({
      key: `${orgId}::${locationId}`,
      orgId,
      orgName: String(loc.orgName ?? orgId),
      orgSlug,
      referralCode,
      locationId,
      locationName: String(loc.locationName ?? locationId),
      city: String(loc.city ?? ""),
      address: String(loc.address ?? ""),
      prizeValidityDays,
      live,
      mine,
    });
  }

  return groups.sort((a, b) => a.orgName.localeCompare(b.orgName) || a.locationName.localeCompare(b.locationName));
}
