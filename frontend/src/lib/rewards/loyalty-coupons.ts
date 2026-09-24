import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import { customerName } from "@/lib/customers/customer-lookup";
import { getRewardById } from "@/lib/loyalty/loyalty-account";
import { CUSTOMER_REWARDS } from "@/lib/rewards/customer-reward-service";

export type LoyaltyCouponStatus = "Active" | "Redeemed" | "Expired";

export type LoyaltyCoupon = {
  id: string;
  code: string;
  customerId: EntityId;
  customerName: string;
  type: "Offer" | "Partner" | "Wheel" | "Scratch" | "Stamp";
  title: string;
  detail: string;
  status: LoyaltyCouponStatus;
  issuedAt: string;
  redeemedAt: string;
  expiresAt: string;
  orgId: EntityId;
  locationId: EntityId;
  refCollection: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeStatus(raw: string, expiresAt: string): LoyaltyCouponStatus {
  if (raw === "Redeemed") return "Redeemed";
  if (expiresAt && expiresAt < today()) return "Expired";
  if (raw === "Issued" || raw === "Available" || raw === "Pending" || raw === "Completed") return "Active";
  return "Active";
}

function mapOffer(db: Db, row: Row): LoyaltyCoupon {
  const customerId = String(row["customerId"] ?? "");
  return {
    id: String(row.id),
    code: String(row["couponCode"] ?? row.id),
    customerId,
    customerName: customerName(db, customerId),
    type: "Offer",
    title: String(row["offerTitle"] ?? row["offerId"] ?? "QR offer"),
    detail: String(row["offerType"] ?? "Promotion"),
    status: normalizeStatus(String(row["status"] ?? "Issued"), ""),
    issuedAt: String(row["issuedAt"] ?? ""),
    redeemedAt: String(row["redeemedAt"] ?? ""),
    expiresAt: "",
    orgId: String(row["orgId"] ?? ""),
    locationId: String(row["locationId"] ?? ""),
    refCollection: "qrOfferRedemptions",
  };
}

function mapPartner(db: Db, row: Row): LoyaltyCoupon {
  const customerId = String(row["customerId"] ?? "");
  return {
    id: String(row.id),
    code: String(row["couponCode"] ?? row.id),
    customerId,
    customerName: customerName(db, customerId),
    type: "Partner",
    title: String(row["offer"] ?? "Partner coupon"),
    detail: String(row["direction"] ?? "Partner"),
    status: normalizeStatus(String(row["status"] ?? "Issued"), ""),
    issuedAt: String(row["issuedAt"] ?? ""),
    redeemedAt: String(row["redeemedAt"] ?? ""),
    expiresAt: String(row["expiresAt"] ?? ""),
    orgId: String(row["orgId"] ?? ""),
    locationId: String(row["locationId"] ?? ""),
    refCollection: "partnerCoupons",
  };
}

function mapWheel(db: Db, row: Row): LoyaltyCoupon | null {
  const prizeType = String(row["rewardType"] ?? "");
  if (prizeType === "Bonus points" || prizeType === "No prize") return null;
  const customerId = String(row["customerId"] ?? "");
  const master = row["rewardId"] ? getRewardById(db, String(row["rewardId"])) : null;
  return {
    id: String(row.id),
    code: String(row.id),
    customerId,
    customerName: customerName(db, customerId),
    type: "Wheel",
    title: String(master?.["name"] ?? row["label"] ?? "Wheel prize"),
    detail: prizeType,
    status: normalizeStatus(String(row["status"] ?? "Pending"), String(row["expiresAt"] ?? "")),
    issuedAt: String(row["spunAt"] ?? row["createdAt"] ?? ""),
    redeemedAt: String(row["redeemedAt"] ?? ""),
    expiresAt: String(row["expiresAt"] ?? ""),
    orgId: String(row["orgId"] ?? ""),
    locationId: String(row["locationId"] ?? ""),
    refCollection: "wheelSpins",
  };
}

function mapScratch(db: Db, row: Row): LoyaltyCoupon | null {
  const prizeType = String(row["rewardType"] ?? "");
  if (prizeType === "Bonus points" || prizeType === "No prize") return null;
  const customerId = String(row["customerId"] ?? "");
  const master = row["rewardId"] ? getRewardById(db, String(row["rewardId"])) : null;
  return {
    id: String(row.id),
    code: String(row.id),
    customerId,
    customerName: customerName(db, customerId),
    type: "Scratch",
    title: String(master?.["name"] ?? row["label"] ?? "Scratch prize"),
    detail: prizeType,
    status: normalizeStatus(String(row["status"] ?? "Pending"), String(row["expiresAt"] ?? "")),
    issuedAt: String(row["createdAt"] ?? ""),
    redeemedAt: String(row["redeemedAt"] ?? ""),
    expiresAt: String(row["expiresAt"] ?? ""),
    orgId: String(row["orgId"] ?? ""),
    locationId: String(row["locationId"] ?? ""),
    refCollection: "scratchPlays",
  };
}

function mapStamp(db: Db, row: Row): LoyaltyCoupon {
  const customerId = String(row["customerId"] ?? "");
  const master = row["rewardId"] ? getRewardById(db, String(row["rewardId"])) : null;
  return {
    id: String(row.id),
    code: String(row.id),
    customerId,
    customerName: customerName(db, customerId),
    type: "Stamp",
    title: String(master?.["name"] ?? row["title"] ?? "Stamp reward"),
    detail: String(master?.["description"] ?? row["description"] ?? "Stamp card"),
    status: normalizeStatus(String(row["status"] ?? "Available"), String(row["expiresAt"] ?? "")),
    issuedAt: String(row["issuedAt"] ?? ""),
    redeemedAt: String(row["redeemedAt"] ?? ""),
    expiresAt: String(row["expiresAt"] ?? ""),
    orgId: String(row["orgId"] ?? ""),
    locationId: String(row["locationId"] ?? ""),
    refCollection: CUSTOMER_REWARDS,
  };
}

export function listLoyaltyCoupons(
  db: Db,
  scope?: { orgId?: EntityId; locationId?: EntityId },
): LoyaltyCoupon[] {
  const inScope = (row: Row) => {
    if (scope?.orgId && String(row["orgId"] ?? "") !== String(scope.orgId)) return false;
    if (scope?.locationId && scope.locationId !== "all" && row["locationId"]) {
      if (String(row["locationId"]) !== String(scope.locationId)) return false;
    }
    return true;
  };

  const rows: LoyaltyCoupon[] = [];
  for (const r of db["qrOfferRedemptions"] ?? []) {
    if (inScope(r)) rows.push(mapOffer(db, r));
  }
  for (const r of db["partnerCoupons"] ?? []) {
    if (inScope(r)) rows.push(mapPartner(db, r));
  }
  for (const r of db["wheelSpins"] ?? []) {
    if (!inScope(r)) continue;
    const mapped = mapWheel(db, r);
    if (mapped) rows.push(mapped);
  }
  for (const r of db["scratchPlays"] ?? []) {
    if (!inScope(r)) continue;
    const mapped = mapScratch(db, r);
    if (mapped) rows.push(mapped);
  }
  for (const r of db[CUSTOMER_REWARDS] ?? []) {
    if (inScope(r)) rows.push(mapStamp(db, r));
  }

  return rows.sort((a, b) =>
    (b.issuedAt || b.redeemedAt).localeCompare(a.issuedAt || a.redeemedAt),
  );
}
