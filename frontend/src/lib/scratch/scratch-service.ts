import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import { getCustomerById } from "@/lib/customers/customer-lookup";
import { patchCustomer } from "@/lib/customers/customer-service";
import { postLoyaltyTransaction, type LoyaltyStore } from "@/lib/loyalty/loyalty-service";
import { pickWheelSegment } from "@/lib/qr-loyalty";
import { pickTierWeightedReward, type TierWeights } from "@/lib/reward-distribution";

export const SCRATCH_PRIZES = "scratchPrizes";
export const SCRATCH_PLAYS = "scratchPlays";

export type ScratchStore = LoyaltyStore;

export type ProcessScratchInput = {
  customerId: EntityId;
  prize: Row;
  locationId: EntityId;
  orgId: EntityId;
  programId?: string;
  source: "public" | "qr";
  checkinId?: string;
};

export type ScratchResult = {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
  label: string;
  play?: Row;
  balanceAfter?: number;
};

function playDate(row: Row) {
  return String(row["createdAt"] ?? row["createdon"] ?? "").slice(0, 10);
}

export function customerScratchedToday(db: Db, customerId: EntityId, onDate?: string) {
  const day = onDate ?? new Date().toISOString().slice(0, 10);
  const plays = (db[SCRATCH_PLAYS] ?? []).filter((s) => String(s["customerId"]) === customerId);
  if (plays.some((s) => playDate(s) === day)) return true;
  const customer = getCustomerById(db, customerId);
  return Boolean(customer && String(customer["lastScratchAt"] ?? "") === day);
}

export function getTodayScratchPlay(db: Db, customerId: EntityId, onDate?: string) {
  const day = onDate ?? new Date().toISOString().slice(0, 10);
  return (
    (db[SCRATCH_PLAYS] ?? []).find(
      (s) => String(s["customerId"]) === customerId && playDate(s) === day,
    ) ?? null
  );
}

export function selectScratchPrize(prizes: Row[], tierWeights?: TierWeights) {
  if (tierWeights) return pickTierWeightedReward(prizes, tierWeights);
  return pickWheelSegment(prizes);
}

export function processScratchResult(store: ScratchStore, input: ProcessScratchInput): ScratchResult {
  const customer = getCustomerById(store.db, input.customerId);
  if (!customer) return { ok: false, error: "Customer not found", label: "" };

  const today = new Date().toISOString().slice(0, 10);
  if (customerScratchedToday(store.db, input.customerId, today)) {
    const prior = getTodayScratchPlay(store.db, input.customerId, today);
    return {
      ok: false,
      duplicate: true,
      error: "Already scratched today",
      label: String(prior?.["label"] ?? customer["lastScratchPrize"] ?? ""),
    };
  }

  const label = String(input.prize["label"] ?? "");
  const prizeType = String(input.prize["prizeType"] ?? "");
  const prizeValue = Number(input.prize["prizeValue"] ?? 0);
  const playId = `SCP-${Date.now().toString().slice(-8)}`;
  const programId = input.programId ?? String(input.prize["programId"] ?? "LY-SCRATCH");

  const play: Row = {
    id: playId,
    customerId: input.customerId,
    locationId: input.locationId,
    orgId: input.orgId,
    programId,
    prizeId: String(input.prize.id ?? ""),
    rewardType: prizeType,
    rewardValue: prizeValue,
    label,
    source: input.source,
    referenceId: input.checkinId ?? playId,
    checkinId: input.checkinId ?? "",
    status: prizeType === "Bonus points" || prizeType === "No prize" ? "Completed" : "Pending",
    createdAt: today,
  };

  store.create(SCRATCH_PLAYS, play, input.orgId);

  let balanceAfter = Number(customer["points"] ?? 0);
  let loyaltyTransactionId = "";
  if (prizeType === "Bonus points" && prizeValue > 0) {
    const posted = postLoyaltyTransaction(store, {
      customerId: input.customerId,
      type: "Earn",
      points: prizeValue,
      source: "scratch",
      referenceId: playId,
      programId,
      locationId: input.locationId,
      reason: `Scratch card · ${label}`,
      orgId: input.orgId,
    });
    if (!posted.ok && !posted.duplicate) {
      return { ok: false, error: posted.error ?? "Could not post scratch points", label };
    }
    balanceAfter = posted.balanceAfter;
    if (posted.transaction) loyaltyTransactionId = String(posted.transaction.id);
  }

  patchCustomer(store, input.customerId, {
    lastScratchPrize: label,
    lastScratchAt: today,
  });

  if (loyaltyTransactionId) {
    store.update(SCRATCH_PLAYS, playId, { ...play, loyaltyTransactionId });
  }

  return { ok: true, label, play, balanceAfter };
}

export function redeemScratchPlayAtPos(
  store: ScratchStore,
  input: { playId: string; invoiceId: EntityId; discountAmount: number },
) {
  const play = (store.db[SCRATCH_PLAYS] ?? []).find((s) => String(s.id) === input.playId);
  if (!play) return { ok: false, error: "Scratch prize not found" };
  if (String(play["status"]) !== "Pending") return { ok: false, duplicate: true, error: "Scratch prize already used" };

  store.update(SCRATCH_PLAYS, input.playId, {
    ...play,
    status: "Redeemed",
    invoiceId: input.invoiceId,
    discountAmount: input.discountAmount,
    redeemedAt: new Date().toISOString().slice(0, 10),
  });
  return { ok: true };
}

export function scratchPlayDiscountAmount(play: Row, subtotal: number) {
  const prizeType = String(play["rewardType"] ?? "");
  const prizeValue = Number(play["rewardValue"] ?? 0);
  if (prizeType === "Flat discount") return Math.min(prizeValue, subtotal);
  if (prizeType === "Percentage discount") return Math.round(subtotal * (prizeValue / 100));
  return 0;
}
