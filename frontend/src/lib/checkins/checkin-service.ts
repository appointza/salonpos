import type { EntityId } from "@/lib/ids";
import type { Row } from "@/lib/store";
import { getCustomerById } from "@/lib/customers/customer-lookup";
import { patchCustomer, type CustomerStore } from "@/lib/customers/customer-service";
import { addExpiry, earnPoints, resolveLoyaltyRule } from "@/lib/loyalty-rules";
import { postLoyaltyTransaction, hasLoyaltyTransaction, type LoyaltyStore } from "@/lib/loyalty/loyalty-service";
import { findLiveMembership } from "@/lib/membership";
import { programOfType } from "@/lib/qr-loyalty";
import { issueEligibleOffers, QR_OFFERS } from "@/lib/offers/offer-redemption-service";

export const QR_CHECKINS = "qrCheckins";

export type CheckinStore = CustomerStore & LoyaltyStore;

export type ProcessCheckinApprovalInput = {
  checkin: Row;
  customer: Row;
  programs: Row[];
  billAmount: number;
  birthdayBonus: boolean;
  locationId: EntityId;
  orgId: EntityId;
  staffId: EntityId;
  staffName: string;
};

export type CheckinApprovalResult = {
  ok: boolean;
  duplicate?: boolean;
  notes: string;
  customerPatch?: Record<string, string | number>;
  error?: string;
};

function computeTier(visits: number, points: number) {
  if (visits >= 20 || points >= 3000) return "Platinum";
  if (visits >= 8 || points >= 1000) return "Gold";
  if (visits >= 3 || points >= 300) return "Silver";
  return "Bronze";
}

export function hasApprovedCheckinToday(db: CheckinStore["db"], customerId: EntityId, day?: string) {
  const on = day ?? new Date().toISOString().slice(0, 10);
  return (db[QR_CHECKINS] ?? []).some(
    (c) =>
      String(c["customerId"]) === customerId &&
      String(c["status"]) === "Approved" &&
      String(c["visitAt"] ?? "").startsWith(on),
  );
}

function hasBirthdayBonusThisYear(db: CheckinStore["db"], customerId: EntityId, year: number) {
  return (db["loyaltyTransactions"] ?? []).some(
    (t) =>
      String(t["customerId"]) === customerId &&
      String(t["source"]) === "checkin" &&
      String(t["reason"] ?? "").toLowerCase().includes("birthday") &&
      String(t["createdon"] ?? t["createdAt"] ?? "").startsWith(String(year)),
  );
}

function hasInvoiceEarnToday(db: CheckinStore["db"], customerId: EntityId, day: string) {
  return (db["loyaltyTransactions"] ?? []).some(
    (t) =>
      String(t["customerId"]) === customerId &&
      String(t["type"]) === "Earn" &&
      String(t["source"]) === "invoice" &&
      String(t["createdon"] ?? t["createdAt"] ?? "") === day,
  );
}

/**
 * Approve a QR check-in: stamps, visits, tier, loyalty via canonical rules.
 * Idempotent — re-approving the same check-in does not double-reward.
 */
export function processCheckinApproval(
  store: CheckinStore,
  input: ProcessCheckinApprovalInput,
): CheckinApprovalResult {
  const checkinId = String(input.checkin.id);
  if (String(input.checkin["status"] ?? "") === "Approved") {
    return { ok: false, duplicate: true, notes: String(input.checkin["rewardEarned"] ?? "Already approved") };
  }

  const customerId = String(input.customer.id);
  const stampsProgram = programOfType(input.programs, "Stamp Card");
  const needed = Math.max(1, Number(stampsProgram?.["stampsRequired"] ?? 8));
  const stampsWas = Number(input.customer["stampsCurrent"] ?? 0);
  let stamps = stampsWas + 1;
  let stampReward = "";
  if (stampsProgram && stamps >= needed) {
    stamps = 0;
    stampReward = String(stampsProgram["rewardDescription"] ?? "Free service");
  }

  const org = (store.db["organizations"] ?? []).find((o) => String(o["orgId"]) === input.orgId);
  const allPrograms = (store.db["loyalty"] ?? []).filter((p) => String(p["orgId"]) === input.orgId);
  const rule = resolveLoyaltyRule(allPrograms, org, {
    locationId: input.locationId,
    tier: String(input.customer["tier"] ?? "All"),
  });

  let earnedFromBill = 0;
  const today = new Date().toISOString().slice(0, 10);
  if (input.billAmount > 0 && !hasInvoiceEarnToday(store.db, customerId, today)) {
    earnedFromBill = earnPoints(input.billAmount, rule);
  }
  const year = new Date().getFullYear();
  const birthdayPts = input.birthdayBonus && !hasBirthdayBonusThisYear(store.db, customerId, year) ? 50 : 0;
  const totalEarn = earnedFromBill + birthdayPts;

  if (totalEarn > 0 && !hasLoyaltyTransaction(store.db, "checkin", checkinId, "Earn")) {
    postLoyaltyTransaction(store, {
      customerId,
      type: "Earn",
      points: totalEarn,
      source: "checkin",
      referenceId: checkinId,
      programId: rule.programId,
      locationId: input.locationId,
      expiresOn: addExpiry(new Date().toISOString().slice(0, 10), rule.expiryMonths),
      reason: [
        earnedFromBill ? `Check-in bill · +${earnedFromBill} pts` : "",
        birthdayPts ? `Birthday bonus · +${birthdayPts} pts` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      orgId: input.orgId,
    });
  }

  const visits = Number(input.customer["totalVisits"] ?? input.customer["visits"] ?? 0) + 1;
  const points = Number(getCustomerById(store.db, customerId)?.["points"] ?? input.customer["points"] ?? 0);
  const tier = computeTier(visits, points);

  const memberships = (store.db["memberships"] ?? []).filter((m) => String(m["orgId"]) === input.orgId);
  const membership = findLiveMembership(memberships, {
    id: customerId,
    membershipId: input.customer["membershipId"] ?? "",
  });

  patchCustomer(store, customerId, {
    stampsCurrent: stamps,
    tier,
    totalVisits: visits,
    visits,
    lastVisit: today,
  });

  const offers = (store.db[QR_OFFERS] ?? []).filter((o) => String(o["orgId"]) === input.orgId);
  const issuedOffers = issueEligibleOffers(store, {
    customerId,
    customer: getCustomerById(store.db, customerId) ?? input.customer,
    checkinId,
    locationId: input.locationId,
    orgId: input.orgId,
    offers,
  });

  const notes = [
    stampsProgram ? (stampReward ? `Stamp card complete: ${stampReward}` : `Stamp ${stamps}/${needed}`) : "",
    earnedFromBill ? `+${earnedFromBill} pts` : "",
    birthdayPts ? "Birthday bonus +50 pts" : "",
    membership ? `Member · ${String(membership["plan"] ?? membership.id)}` : "",
    issuedOffers.length ? `${issuedOffers.length} offer${issuedOffers.length === 1 ? "" : "s"} issued` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    ok: true,
    notes: notes || "Approved",
    customerPatch: { stampsCurrent: stamps, tier, totalVisits: visits },
  };
}

/** Auto-approve immediately after guest check-in (no staff queue). */
export function autoApproveCheckin(
  store: CheckinStore,
  input: Omit<ProcessCheckinApprovalInput, "staffId" | "staffName"> & { staffName?: string },
): CheckinApprovalResult {
  return processCheckinApproval(store, {
    ...input,
    staffId: "",
    staffName: input.staffName ?? "Self check-in",
  });
}
