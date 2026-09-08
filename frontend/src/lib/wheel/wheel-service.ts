import type { Db, Row } from "@/lib/store";
import { getCustomerById } from "@/lib/customers/customer-lookup";
import { patchCustomer } from "@/lib/customers/customer-service";
import { postLoyaltyTransaction, type LoyaltyStore } from "@/lib/loyalty/loyalty-service";
import { pickWheelSegment } from "@/lib/qr-loyalty";

export const WHEEL_SPINS = "wheelSpins";

export type WheelStore = LoyaltyStore;

export type ProcessWheelSpinInput = {
  customerId: string;
  segment: Row;
  locationId: string;
  orgId: string;
  programId?: string;
  source: "public" | "qr";
  checkinId?: string;
};

export type WheelSpinResult = {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
  label: string;
  spin?: Row;
  balanceAfter?: number;
};

function spinDate(row: Row) {
  return String(row["createdAt"] ?? row["createdon"] ?? "").slice(0, 10);
}

/** Whether the customer already spun today (wheelSpins ledger + legacy lastWheelAt). */
export function customerSpunToday(db: Db, customerId: string, onDate?: string) {
  const day = onDate ?? new Date().toISOString().slice(0, 10);
  const spins = (db[WHEEL_SPINS] ?? []).filter((s) => String(s["customerId"]) === customerId);
  if (spins.some((s) => spinDate(s) === day)) return true;
  const customer = getCustomerById(db, customerId);
  return Boolean(customer && String(customer["lastWheelAt"] ?? "") === day);
}

export function getTodayWheelSpin(db: Db, customerId: string, onDate?: string) {
  const day = onDate ?? new Date().toISOString().slice(0, 10);
  return (
    (db[WHEEL_SPINS] ?? []).find(
      (s) => String(s["customerId"]) === customerId && spinDate(s) === day,
    ) ?? null
  );
}

export function hasWheelSpinForReference(db: Db, referenceId: string) {
  return (db[WHEEL_SPINS] ?? []).some((s) => String(s["referenceId"] ?? s["checkinId"] ?? "") === referenceId);
}

/**
 * Record a wheel outcome after the UI animation selects a segment.
 * Bonus points go through the loyalty ledger; other prizes are recorded as pending.
 */
export function processWheelSpinResult(store: WheelStore, input: ProcessWheelSpinInput): WheelSpinResult {
  const customer = getCustomerById(store.db, input.customerId);
  if (!customer) return { ok: false, error: "Customer not found", label: "" };

  const today = new Date().toISOString().slice(0, 10);
  if (customerSpunToday(store.db, input.customerId, today)) {
    const prior = getTodayWheelSpin(store.db, input.customerId, today);
    return {
      ok: false,
      duplicate: true,
      error: "Already spun today",
      label: String(prior?.["label"] ?? customer["lastWheelPrize"] ?? ""),
    };
  }

  if (input.checkinId && hasWheelSpinForReference(store.db, input.checkinId)) {
    return { ok: false, duplicate: true, error: "Check-in wheel already used", label: "" };
  }

  const label = String(input.segment["label"] ?? "");
  const prizeType = String(input.segment["prizeType"] ?? "");
  const prizeValue = Number(input.segment["prizeValue"] ?? 0);
  const spinId = `WSN-${Date.now().toString().slice(-8)}`;
  const programId = input.programId ?? String(input.segment["programId"] ?? "LY-WHEEL");

  const spin: Row = {
    id: spinId,
    customerId: input.customerId,
    locationId: input.locationId,
    orgId: input.orgId,
    programId,
    segmentId: String(input.segment.id ?? ""),
    rewardType: prizeType,
    rewardValue: prizeValue,
    label,
    source: input.source,
    referenceId: input.checkinId ?? spinId,
    checkinId: input.checkinId ?? "",
    status: prizeType === "Bonus points" || prizeType === "No prize" ? "Completed" : "Pending",
    createdAt: today,
  };

  store.create(WHEEL_SPINS, spin, input.orgId);

  let balanceAfter = Number(customer["points"] ?? 0);
  let loyaltyTransactionId = "";
  if (prizeType === "Bonus points" && prizeValue > 0) {
    const posted = postLoyaltyTransaction(store, {
      customerId: input.customerId,
      type: "Earn",
      points: prizeValue,
      source: "wheel",
      referenceId: spinId,
      programId,
      locationId: input.locationId,
      reason: `Wheel prize · ${label}`,
      orgId: input.orgId,
    });
    if (!posted.ok && !posted.duplicate) {
      return { ok: false, error: posted.error ?? "Could not post wheel points", label };
    }
    balanceAfter = posted.balanceAfter;
    if (posted.transaction) loyaltyTransactionId = String(posted.transaction.id);
  }

  patchCustomer(store, input.customerId, {
    lastWheelPrize: label,
    lastWheelAt: today,
  });

  if (loyaltyTransactionId) {
    store.update(WHEEL_SPINS, spinId, { ...spin, loyaltyTransactionId });
  }

  return { ok: true, label, spin, balanceAfter };
}

export function getPendingWheelSpins(db: Db, customerId: string) {
  return (db[WHEEL_SPINS] ?? []).filter(
    (s) => String(s["customerId"]) === customerId && String(s["status"]) === "Pending",
  );
}

export function wheelSpinDiscountAmount(spin: Row, subtotal: number) {
  const prizeType = String(spin["rewardType"] ?? "");
  const prizeValue = Number(spin["rewardValue"] ?? 0);
  if (prizeType === "Flat discount") return Math.min(prizeValue, subtotal);
  if (prizeType === "Percentage discount") return Math.round(subtotal * (prizeValue / 100));
  return 0;
}

export function redeemWheelSpinAtPos(
  store: WheelStore,
  input: { spinId: string; invoiceId: string; discountAmount: number },
) {
  const spin = (store.db[WHEEL_SPINS] ?? []).find((s) => String(s.id) === input.spinId);
  if (!spin) return { ok: false, error: "Wheel spin not found" };
  if (String(spin["status"]) !== "Pending") return { ok: false, duplicate: true, error: "Wheel reward already used" };

  store.update(WHEEL_SPINS, input.spinId, {
    ...spin,
    status: "Redeemed",
    redeemed: "Yes",
    invoiceId: input.invoiceId,
    discountAmount: input.discountAmount,
    redeemedAt: new Date().toISOString().slice(0, 10),
  });
  return { ok: true };
}

/** Weighted segment selection — shared by both wheel entry points. */
export function selectWheelSegment(segments: Row[]) {
  return pickWheelSegment(segments);
}
