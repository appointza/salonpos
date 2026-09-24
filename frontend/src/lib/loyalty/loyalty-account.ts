import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import { getCustomerById } from "@/lib/customers/customer-lookup";
import { COLLECTIONS } from "@/lib/loyalty/schema";

export const REWARDS = COLLECTIONS.rewards;
export const OFFERS = COLLECTIONS.offers;

export const DEFAULT_POINTS_PROGRAM = "LY-01";
export const DEFAULT_STAMP_PROGRAM = "LY-STAMP";
export const DEFAULT_WHEEL_PROGRAM = "LY-WHEEL";

export function getOffers(db: Db) {
  return db[OFFERS]?.length ? db[OFFERS] : db["qrOffers"] ?? [];
}

export function getRewardById(db: Db, rewardId: string) {
  return (db[REWARDS] ?? []).find((r) => String(r.id) === rewardId) ?? null;
}

export function getCustomerLoyaltyAccount(db: Db, customerId: EntityId, programId: string) {
  return (
    (db[COLLECTIONS.customerLoyalty] ?? []).find(
      (a) => String(a["customerId"]) === customerId && String(a["programId"]) === programId,
    ) ?? null
  );
}

export function getPointsBalance(db: Db, customerId: EntityId, programId = DEFAULT_POINTS_PROGRAM) {
  const account = getCustomerLoyaltyAccount(db, customerId, programId);
  if (account) return Number(account["pointsBalance"] ?? 0);
  return Number(getCustomerById(db, customerId)?.["points"] ?? 0);
}

export function getCustomerTier(db: Db, customerId: EntityId, programId = DEFAULT_POINTS_PROGRAM) {
  const account = getCustomerLoyaltyAccount(db, customerId, programId);
  if (account?.["tierId"]) return String(account["tierId"]);
  return String(getCustomerById(db, customerId)?.["tier"] ?? "Silver");
}

export function getStampProgress(db: Db, customerId: EntityId, programId = DEFAULT_STAMP_PROGRAM) {
  const stampRow = (db[COLLECTIONS.customerStamps] ?? []).find(
    (s) => String(s["customerId"]) === customerId && String(s["programId"]) === programId,
  );
  const stampConfig = (db[COLLECTIONS.stampPrograms] ?? []).find((p) => String(p["programId"]) === programId);
  const customer = getCustomerById(db, customerId);
  const current = Number(stampRow?.["currentStamps"] ?? customer?.["stampsCurrent"] ?? 0);
  const required = Math.max(1, Number(stampConfig?.["stampsRequired"] ?? 8));
  return { current, required, stampRow };
}
