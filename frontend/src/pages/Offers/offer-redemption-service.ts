import type { EntityId } from "@/ids";
import { sameId } from "@/ids";
import type { Db, Row } from "@/store";
import { getCustomerById } from "@/pages/Customers/customer-lookup";
import { isBirthdayWindow } from "@/pages/LoyaltyQr/qr-loyalty";
import type { LoyaltyStore } from "@/pages/Loyalty/loyalty-service";
import { lineMatchesServiceSpec } from "@/pages/Memberships/membership";

export const QR_OFFER_REDEMPTIONS = "qrOfferRedemptions";
export const QR_OFFERS = "qrOffers";

export type OfferStore = LoyaltyStore;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function isNewCustomer(db: Db, customerId: EntityId) {
  const customer = getCustomerById(db, customerId);
  if (!customer) return false;
  const visits = Number(customer["totalVisits"] ?? customer["visits"] ?? 0);
  const priorCheckins = (db["qrCheckins"] ?? []).filter(
    (c) => String(c["customerId"]) === customerId && String(c["status"]) === "Approved",
  ).length;
  return visits <= 1 && priorCheckins <= 1;
}

function isOfferInValidityWindow(offer: Row, onDate = today()) {
  const start = String(offer["validityStart"] ?? "");
  const end = String(offer["validityEnd"] ?? "");
  if (start && onDate < start) return false;
  if (end && onDate > end) return false;
  return true;
}

export function isOfferEligible(offer: Row, customer: Row, db: Db, onDate = today()) {
  if (String(offer["status"] ?? "") !== "Active") return false;
  if (!isOfferInValidityWindow(offer, onDate)) return false;

  const segment = String(offer["eligibleSegment"] ?? "All");
  if (segment === "All") return true;
  if (segment === "Birthday") return isBirthdayWindow(String(customer["birthday"] ?? ""));
  if (segment === "New customer") return isNewCustomer(db, String(customer.id));
  if (segment === "Gold" || segment === "Platinum") return String(customer["tier"] ?? "") === segment;
  return false;
}

/** Active offers at an outlet, filtered for a guest on the public booking page. */
export function listOffersForPublicGuest(
  db: Db,
  input: {
    orgId: EntityId;
    locationId: EntityId;
    customer?: Row | null;
    treatAsNewGuest?: boolean;
    onDate?: string;
  },
) {
  const day = input.onDate ?? today();
  const pool = (db[QR_OFFERS] ?? []).filter((offer) => {
    if (String(offer["orgId"] ?? "") !== String(input.orgId)) return false;
    if (String(offer["status"] ?? "") !== "Active") return false;
    const loc = String(offer["locationId"] ?? "");
    if (loc && loc !== "0" && loc !== String(input.locationId)) return false;
    return isOfferInValidityWindow(offer, day);
  });

  if (input.customer) {
    return pool.filter((offer) => isOfferEligible(offer, input.customer!, db, day));
  }

  return pool.filter((offer) => {
    const segment = String(offer["eligibleSegment"] ?? "All");
    if (segment === "All") return true;
    if (input.treatAsNewGuest && segment === "New customer") return true;
    return false;
  });
}

export function offerDiscountAmount(
  offer: Row,
  subtotal: number,
  cart: { id: string; name: string; price: number; qty: number }[] = [],
  services: Row[] = [],
) {
  const type = String(offer["offerType"] ?? "");
  const title = String(offer["title"] ?? "").toLowerCase();
  const desc = String(offer["description"] ?? "").toLowerCase();
  const hay = `${title} ${desc}`;
  const spec = String(offer["serviceName"] ?? "");

  if (type === "Free service" || type === "Free item") {
    const line = cart.find((l) => lineMatchesServiceSpec(l, spec, services));
    if (line) return Math.round(line.price * line.qty);
    return 0;
  }

  if (type === "% off" || hay.includes("%")) {
    const match = hay.match(/(\d+)\s*%/);
    const pct = match ? Number(match[1]) : 10;
    const base = spec
      ? cart.filter((l) => lineMatchesServiceSpec(l, spec, services)).reduce((s, l) => s + l.price * l.qty, 0)
      : subtotal;
    return Math.round((base || subtotal) * (pct / 100));
  }
  if (type === "Flat off") {
    const match = hay.match(/₹\s*(\d+)/);
    return match ? Number(match[1]) : 200;
  }
  return 0;
}

export function hasOfferRedemptionForCheckin(db: Db, checkinId: string, offerId: string) {
  return (db[QR_OFFER_REDEMPTIONS] ?? []).some(
    (r) => sameId(r["checkinId"], checkinId) && sameId(r["offerId"], offerId),
  );
}

/** Issue eligible offers after QR check-in (idempotent per check-in + offer). */
export function issueEligibleOffers(
  store: OfferStore,
  input: {
    customerId: EntityId;
    customer: Row;
    checkinId: string;
    locationId: EntityId;
    orgId: EntityId;
    offers: Row[];
  },
): Row[] {
  const issued: Row[] = [];
  const day = today();
  for (const offer of input.offers) {
    if (!sameId(offer["orgId"], input.orgId)) continue;
    const loc = String(offer["locationId"] ?? "");
    if (loc && loc !== "0" && !sameId(loc, input.locationId)) continue;
    if (!isOfferEligible(offer, input.customer, store.db, day)) continue;
    if (hasOfferRedemptionForCheckin(store.db, input.checkinId, String(offer.id))) continue;

    const row: Row = {
      id: 0,
      orgId: Number(input.orgId) || 0,
      locationId: Number(input.locationId) || 0,
      offerId: Number(offer.id) || 0,
      customerId: Number(input.customerId) || 0,
      checkinId: Number(input.checkinId) || 0,
      invoiceId: 0,
      status: "Issued",
      discountAmount: 0,
      issuedAt: day,
      redeemedAt: "",
      offerTitle: String(offer["title"] ?? ""),
      offerType: String(offer["offerType"] ?? ""),
    };
    store.create(QR_OFFER_REDEMPTIONS, row, input.orgId);
    issued.push(row);
  }
  return issued;
}

export function getPendingOfferRedemptions(db: Db, customerId: EntityId) {
  return (db[QR_OFFER_REDEMPTIONS] ?? []).filter(
    (r) => sameId(r["customerId"], customerId) && String(r["status"]) === "Issued",
  );
}

export function listOfferClaims(
  db: Db,
  scope?: { orgId?: EntityId; locationId?: EntityId },
) {
  return (db[QR_OFFER_REDEMPTIONS] ?? []).filter((r) => {
    if (scope?.orgId && r["orgId"] && !sameId(r["orgId"], scope.orgId)) return false;
    if (scope?.locationId && scope.locationId !== "all" && r["locationId"]) {
      if (Number(r["locationId"]) > 0 && !sameId(r["locationId"], scope.locationId)) return false;
    }
    return true;
  });
}

export function issueOfferToCustomer(
  store: OfferStore,
  input: {
    offer: Row;
    customerId: EntityId;
    orgId: EntityId;
    locationId: EntityId;
  },
) {
  const customer = getCustomerById(store.db, input.customerId);
  if (!customer) return { ok: false as const, error: "Customer not found" };
  const day = today();
  if (!isOfferEligible(input.offer, customer, store.db, day)) {
    return { ok: false as const, error: "Customer is not eligible for this offer" };
  }
  const already = (store.db[QR_OFFER_REDEMPTIONS] ?? []).some(
    (r) =>
      sameId(r["offerId"], input.offer.id) &&
      sameId(r["customerId"], input.customerId) &&
      String(r["status"]) === "Issued",
  );
  if (already) return { ok: false as const, error: "This offer is already issued to the customer" };

  const row: Row = {
    id: 0,
    orgId: Number(input.orgId) || 0,
    locationId: Number(input.locationId) || 0,
    offerId: Number(input.offer.id) || 0,
    customerId: Number(input.customerId) || 0,
    checkinId: 0,
    invoiceId: 0,
    status: "Issued",
    discountAmount: 0,
    issuedAt: day,
    redeemedAt: "",
    offerTitle: String(input.offer["title"] ?? ""),
    offerType: String(input.offer["offerType"] ?? ""),
  };
  store.create(QR_OFFER_REDEMPTIONS, row, input.orgId);
  return { ok: true as const, row };
}

export function redeemOfferAtPos(
  store: OfferStore,
  input: { redemptionId: string; invoiceId: EntityId; discountAmount: number; orgId?: EntityId },
) {
  const row = (store.db[QR_OFFER_REDEMPTIONS] ?? []).find((r) => String(r.id) === input.redemptionId);
  if (!row) return { ok: false, error: "Offer redemption not found" };
  if (String(row["status"]) !== "Issued") return { ok: false, duplicate: true, error: "Offer already used" };

  store.update(QR_OFFER_REDEMPTIONS, input.redemptionId, {
    ...row,
    status: "Redeemed",
    invoiceId: input.invoiceId,
    discountAmount: input.discountAmount,
    redeemedAt: today(),
  });
  return { ok: true };
}
