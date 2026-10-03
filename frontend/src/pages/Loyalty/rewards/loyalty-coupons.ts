import type { EntityId } from "@/ids";
import { sameId } from "@/ids";
import type { Db, Row } from "@/store";
import { customerName } from "@/pages/Customers/customer-lookup";
import { getRewardById } from "@/pages/Loyalty/loyalty-account";
import { CUSTOMER_REWARDS } from "@/pages/Loyalty/rewards/customer-reward-service";
import { resolvePoolCodeStatus } from "@/pages/Coupons/coupon-code-pool";
import { VOUCHERS } from "@/pages/Coupons/voucher-local";

export type LoyaltyCouponStatus = "Active" | "Redeemed" | "Expired";

export type LoyaltyCoupon = {
  id: string;
  code: string;
  customerId: EntityId;
  customerName: string;
  type: "Offer" | "Partner" | "Wheel" | "Scratch" | "Stamp" | "Coupon";
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
  if (raw === "Redeemed" || raw === "Used") return "Redeemed";
  if (expiresAt && expiresAt < today()) return "Expired";
  if (raw === "Issued" || raw === "Available" || raw === "Pending" || raw === "Completed" || raw === "Active") return "Active";
  return "Active";
}

function mapSchemeVoucher(db: Db, row: Row): LoyaltyCoupon | null {
  const poolStatus = resolvePoolCodeStatus(row);
  if (poolStatus === "Available" || poolStatus === "Cancelled") return null;
  const customerId = String(row["issueTo"] || row["customerId"] || "");
  if (!customerId || customerId === "0") {
    if (poolStatus !== "Used" && poolStatus !== "Expired") return null;
  }
  return {
    id: String(row.id),
    code: String(row["code"] ?? row.id),
    customerId,
    customerName: customerId && customerId !== "0" ? customerName(db, customerId) : "Walk-in",
    type: "Coupon",
    title: String(row["schemeTitle"] ?? "Coupon"),
    detail: String(row["schemeCode"] ?? "Scheme"),
    status: poolStatus === "Used" ? "Redeemed" : poolStatus === "Expired" ? "Expired" : "Active",
    issuedAt: String(row["issuedAt"] ?? ""),
    redeemedAt: String(row["redeemedAt"] ?? ""),
    expiresAt: "",
    orgId: String(row["orgId"] ?? ""),
    locationId: String(row["locationId"] ?? ""),
    refCollection: VOUCHERS,
  };
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
    if (scope?.orgId && row["orgId"] && !sameId(row["orgId"], scope.orgId)) return false;
    if (scope?.locationId && scope.locationId !== "all" && row["locationId"]) {
      if (Number(row["locationId"]) > 0 && !sameId(row["locationId"], scope.locationId)) return false;
    }
    return true;
  };

  const rows: LoyaltyCoupon[] = [];
  for (const r of db[VOUCHERS] ?? []) {
    if (!inScope(r)) continue;
    const mapped = mapSchemeVoucher(db, r);
    if (mapped) rows.push(mapped);
  }
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
