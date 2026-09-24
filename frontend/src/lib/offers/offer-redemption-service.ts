import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import { getCustomerById } from "@/lib/customers/customer-lookup";
import { isBirthdayWindow } from "@/lib/qr-loyalty";
import type { LoyaltyStore } from "@/lib/loyalty/loyalty-service";

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
    if (String(offer["orgId"] ?? "") !== input.orgId) return false;
    if (String(offer["status"] ?? "") !== "Active") return false;
    const loc = String(offer["locationId"] ?? "");
    if (loc && loc !== input.locationId) return false;
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

export function offerDiscountAmount(offer: Row, subtotal: number) {
  const type = String(offer["offerType"] ?? "");
  const title = String(offer["title"] ?? "").toLowerCase();
  const desc = String(offer["description"] ?? "").toLowerCase();
  const hay = `${title} ${desc}`;

  if (type === "% off" || hay.includes("%")) {
    const match = hay.match(/(\d+)\s*%/);
    const pct = match ? Number(match[1]) : 10;
    return Math.round(subtotal * (pct / 100));
  }
  if (type === "Flat off") {
    const match = hay.match(/₹\s*(\d+)/);
    return match ? Number(match[1]) : 200;
  }
  return 0;
}

export function hasOfferRedemptionForCheckin(db: Db, checkinId: string, offerId: string) {
  return (db[QR_OFFER_REDEMPTIONS] ?? []).some(
    (r) => String(r["checkinId"]) === checkinId && String(r["offerId"]) === offerId,
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
    if (String(offer["orgId"] ?? "") !== input.orgId) continue;
    const loc = String(offer["locationId"] ?? "");
    if (loc && loc !== input.locationId) continue;
    if (!isOfferEligible(offer, input.customer, store.db, day)) continue;
    if (hasOfferRedemptionForCheckin(store.db, input.checkinId, String(offer.id))) continue;

    const row: Row = {
      id: `OR-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90)}`,
      orgId: input.orgId,
      locationId: input.locationId,
      offerId: String(offer.id),
      customerId: input.customerId,
      checkinId: input.checkinId,
      invoiceId: "",
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
    (r) => String(r["customerId"]) === customerId && String(r["status"]) === "Issued",
  );
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
