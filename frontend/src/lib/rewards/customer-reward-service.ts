import type { Db, Row } from "@/lib/store";
import type { LoyaltyStore } from "@/lib/loyalty/loyalty-service";

export const CUSTOMER_REWARDS = "customerRewards";

export type CustomerRewardStore = LoyaltyStore;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(from: string, days: number) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function hasCustomerRewardForSource(db: Db, sourceType: string, sourceId: string) {
  return (db[CUSTOMER_REWARDS] ?? []).some(
    (r) => String(r["sourceType"]) === sourceType && String(r["sourceId"]) === sourceId,
  );
}

/** Issue a stamp-card completion reward (idempotent per check-in). */
export function issueStampReward(
  store: CustomerRewardStore,
  input: {
    customerId: string;
    checkinId: string;
    title: string;
    description: string;
    rewardType: string;
    programId: string;
    orgId: string;
    locationId: string;
    validityDays?: number;
  },
) {
  if (hasCustomerRewardForSource(store.db, "stamp", input.checkinId)) {
    return { ok: true, duplicate: true };
  }

  const issuedAt = today();
  const row: Row = {
    id: `CR-${Date.now().toString().slice(-8)}`,
    orgId: input.orgId,
    locationId: input.locationId,
    customerId: input.customerId,
    sourceType: "stamp",
    sourceId: input.checkinId,
    programId: input.programId,
    title: input.title,
    description: input.description,
    rewardType: input.rewardType,
    value: 0,
    status: "Available",
    issuedAt,
    expiresAt: addDays(issuedAt, input.validityDays ?? 90),
    redeemedAt: "",
    invoiceId: "",
  };
  store.create(CUSTOMER_REWARDS, row, input.orgId);
  return { ok: true, reward: row };
}

export function getAvailableCustomerRewards(db: Db, customerId: string) {
  const day = today();
  return (db[CUSTOMER_REWARDS] ?? []).filter((r) => {
    if (String(r["customerId"]) !== customerId) return false;
    if (String(r["status"]) !== "Available") return false;
    const exp = String(r["expiresAt"] ?? "");
    return !exp || exp >= day;
  });
}

export function customerRewardDiscountAmount(reward: Row, subtotal: number) {
  const type = String(reward["rewardType"] ?? "");
  const value = Number(reward["value"] ?? 0);
  if (type === "Flat discount") return Math.min(value, subtotal);
  if (type === "Percentage discount") return Math.round(subtotal * (value / 100));
  if (type === "Free service" || type === "Free item") return 0;
  return 0;
}

export function redeemCustomerRewardAtPos(
  store: CustomerRewardStore,
  input: { rewardId: string; invoiceId: string; discountAmount: number },
) {
  const row = (store.db[CUSTOMER_REWARDS] ?? []).find((r) => String(r.id) === input.rewardId);
  if (!row) return { ok: false, error: "Reward not found" };
  if (String(row["status"]) !== "Available") return { ok: false, duplicate: true, error: "Reward already used" };
  const exp = String(row["expiresAt"] ?? "");
  if (exp && exp < today()) return { ok: false, error: "Reward expired" };
  if (String(row["invoiceId"] ?? "")) return { ok: false, duplicate: true, error: "Reward already linked" };

  store.update(CUSTOMER_REWARDS, input.rewardId, {
    ...row,
    status: "Redeemed",
    invoiceId: input.invoiceId,
    discountAmount: input.discountAmount,
    redeemedAt: today(),
  });
  return { ok: true };
}
