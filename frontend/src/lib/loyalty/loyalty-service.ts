import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import { addExpiry } from "@/lib/loyalty-rules";
import { getCustomerById } from "@/lib/customers/customer-lookup";

export const LOYALTY_TX = "loyaltyTransactions";

export type LoyaltyStore = {
  db: Db;
  create: (collection: string, row: Row, orgOverride?: string) => void;
  update: (collection: string, id: string, row: Row) => void;
};

export type LoyaltyTxType = "Earn" | "Redeem" | "Adjust" | "Expire" | "Reverse";

export type PostLoyaltyTransactionInput = {
  customerId: EntityId;
  type: LoyaltyTxType;
  points: number;
  source: string;
  referenceId: string;
  programId?: string;
  locationId?: EntityId;
  expiresOn?: string;
  reason?: string;
  orgId?: EntityId;
  /** Skip duplicate guard (use with care). */
  allowDuplicate?: boolean;
  /** Link to originating business record (invoice, spin, etc.). */
  invoiceId?: string;
};

export function loyaltyTransactionsForCustomer(db: Db, customerId: EntityId) {
  return (db[LOYALTY_TX] ?? []).filter((t) => String(t["customerId"]) === String(customerId));
}

export function getCustomerLoyaltyBalance(db: Db, customerId: EntityId) {
  const txs = loyaltyTransactionsForCustomer(db, customerId);
  if (txs.length > 0) {
    const latest = [...txs].sort((a, b) => {
      const idDiff = Number(b.id) - Number(a.id);
      if (idDiff !== 0) return idDiff;
      return String(b["createdon"] ?? "").localeCompare(String(a["createdon"] ?? ""));
    })[0];
    const after = latest?.["balanceAfter"];
    if (after !== undefined && after !== "") return Number(after);
  }
  return Number(getCustomerById(db, customerId)?.["points"] ?? 0);
}

export function loyaltyReferenceKey(source: string, referenceId: string, type: LoyaltyTxType) {
  return `${source}:${referenceId}:${type}`;
}

export function hasLoyaltyTransaction(
  db: Db,
  source: string,
  referenceId: string,
  type?: LoyaltyTxType,
) {
  return (db[LOYALTY_TX] ?? []).some((t) => {
    if (type && String(t["type"]) !== type) return false;
    const ref = String(t["referenceId"] ?? t["invoiceId"] ?? "");
    if (ref !== referenceId) return false;
    const src = String(t["source"] ?? "");
    if (src && source && src !== source) return false;
    return true;
  });
}

function findLoyaltyTransaction(db: Db, source: string, referenceId: string, type: LoyaltyTxType) {
  return (db[LOYALTY_TX] ?? []).find(
    (t) =>
      String(t["type"]) === type &&
      String(t["referenceId"] ?? t["invoiceId"] ?? "") === referenceId &&
      String(t["source"] ?? "") === source,
  );
}

function applyBalanceChange(before: number, type: LoyaltyTxType, pts: number) {
  if (type === "Redeem" || type === "Expire") {
    if (pts > before) return { ok: false as const, after: before, error: "Insufficient points" };
    return { ok: true as const, after: before - pts };
  }
  if (type === "Reverse") {
    return { ok: true as const, after: before + pts };
  }
  return { ok: true as const, after: before + pts };
}

/**
 * Canonical loyalty writer. Updates customer.points cache and creates ledger row.
 */
export function postLoyaltyTransaction(
  store: LoyaltyStore,
  input: PostLoyaltyTransactionInput,
): { ok: boolean; balanceAfter: number; transaction?: Row; duplicate?: boolean; error?: string } {
  const pts = Math.max(0, Math.floor(Number(input.points) || 0));
  if (pts <= 0) return { ok: false, balanceAfter: getCustomerLoyaltyBalance(store.db, input.customerId), error: "Zero points" };

  if (!input.allowDuplicate && hasLoyaltyTransaction(store.db, input.source, input.referenceId, input.type)) {
    return {
      ok: false,
      duplicate: true,
      balanceAfter: getCustomerLoyaltyBalance(store.db, input.customerId),
    };
  }

  const customer = getCustomerById(store.db, input.customerId);
  if (!customer) return { ok: false, balanceAfter: 0, error: "Customer not found" };

  const before = Number(customer["points"] ?? 0);
  const delta = applyBalanceChange(before, input.type, pts);
  if (!delta.ok) return { ok: false, balanceAfter: delta.after, error: delta.error };

  const today = new Date().toISOString().slice(0, 10);
  const suffix =
    input.type === "Redeem" ? "r" : input.type === "Reverse" ? "v" : input.type === "Expire" ? "x" : "e";
  const tx: Row = {
    id: `LT-${Date.now().toString().slice(-8)}${suffix}`,
    customerId: input.customerId,
    type: input.type,
    points: pts,
    source: input.source,
    referenceId: input.referenceId,
    invoiceId: input.invoiceId ?? input.referenceId,
    programId: input.programId ?? "",
    balanceBefore: before,
    balanceAfter: delta.after,
    reason: input.reason ?? "",
    status: "Posted",
    locationId: input.locationId ?? String(customer["locationId"] ?? ""),
    ...(input.expiresOn ? { expiresOn: input.expiresOn } : {}),
    ...(input.orgId ? { orgId: input.orgId } : {}),
    createdon: today,
    createdAt: today,
  };

  store.create(LOYALTY_TX, tx, input.orgId);
  store.update("customers", input.customerId, { ...customer, points: delta.after });

  return { ok: true, balanceAfter: delta.after, transaction: tx };
}

/** Reverse earn/redeem from a business reference (e.g. refunded invoice). */
export function postLoyaltyReversal(
  store: LoyaltyStore,
  input: {
    customerId: EntityId;
    originalSource: string;
    originalReferenceId: string;
    orgId?: EntityId;
    locationId?: EntityId;
    reason?: string;
  },
): { ok: boolean; reversed: number; balanceAfter: number; error?: string } {
  const reversalRef = `${input.originalReferenceId}:reverse`;
  if (hasLoyaltyTransaction(store.db, "reversal", reversalRef, "Reverse")) {
    return { ok: true, reversed: 0, balanceAfter: getCustomerLoyaltyBalance(store.db, input.customerId) };
  }

  let reversed = 0;
  let balanceAfter = getCustomerLoyaltyBalance(store.db, input.customerId);

  const earn = findLoyaltyTransaction(store.db, input.originalSource, input.originalReferenceId, "Earn");
  if (earn && !hasLoyaltyTransaction(store.db, "reversal", `${reversalRef}:earn`, "Expire")) {
    const pts = Number(earn["points"] ?? 0);
    if (pts > 0) {
      const res = postLoyaltyTransaction(store, {
        customerId: input.customerId,
        type: "Expire",
        points: Math.min(pts, balanceAfter),
        source: "reversal",
        referenceId: `${reversalRef}:earn`,
        invoiceId: String(earn["invoiceId"] ?? input.originalReferenceId),
        programId: String(earn["programId"] ?? ""),
        locationId: input.locationId,
        orgId: input.orgId,
        reason: input.reason ?? `Reversal of earn · ${input.originalReferenceId}`,
      });
      if (res.ok) {
        reversed += pts;
        balanceAfter = res.balanceAfter;
      }
    }
  }

  const redeem = findLoyaltyTransaction(store.db, input.originalSource, input.originalReferenceId, "Redeem");
  if (redeem && !hasLoyaltyTransaction(store.db, "reversal", `${reversalRef}:redeem`, "Reverse")) {
    const pts = Number(redeem["points"] ?? 0);
    if (pts > 0) {
      const res = postLoyaltyTransaction(store, {
        customerId: input.customerId,
        type: "Reverse",
        points: pts,
        source: "reversal",
        referenceId: `${reversalRef}:redeem`,
        invoiceId: String(redeem["invoiceId"] ?? input.originalReferenceId),
        programId: String(redeem["programId"] ?? ""),
        locationId: input.locationId,
        orgId: input.orgId,
        reason: input.reason ?? `Reversal of redeem · ${input.originalReferenceId}`,
      });
      if (res.ok) {
        reversed += pts;
        balanceAfter = res.balanceAfter;
      }
    }
  }

  if (!earn && !redeem) return { ok: false, reversed: 0, balanceAfter, error: "No loyalty transactions to reverse" };
  return { ok: true, reversed, balanceAfter };
}

export { addExpiry };
