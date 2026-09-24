import type { EntityId } from "@/lib/ids";
import type { Row } from "@/lib/store";
import type { BusinessStore } from "@/lib/business/types";
import { emitBusinessEvent } from "@/lib/business/event-bus";
import { missingMessage, missingProducts, recipeDemand, type MissingProduct } from "@/lib/service-recipe";

export const STOCK_MOVEMENTS = "stockMovements";
export const PRODUCTS = "inventory";
export const SERVICE_PRODUCTS = "serviceProducts";

export type StockType = "Opening" | "Purchase" | "Sale" | "Used" | "Adjustment" | "Return" | "Wastage";

const OUTBOUND = new Set<StockType>(["Sale", "Used", "Wastage"]);

export function skuKey(row: Row) {
  return String(row["skuId"] ?? row["sku"] ?? row.id ?? "");
}

/** Signed quantity from a movement row. */
export function signedQty(row: Row) {
  const type = String(row["type"] ?? "") as StockType;
  const explicit = row["quantity"];
  if (explicit !== undefined && explicit !== "") {
    const q = Math.abs(Number(explicit) || 0);
    if (OUTBOUND.has(type)) return -q;
    if (type === "Adjustment") {
      const out = Number(row["qtyOut"] ?? 0);
      const inn = Number(row["qtyIn"] ?? 0);
      if (out > 0) return -q;
      if (inn > 0) return q;
    }
    return q;
  }
  return Number(row["qtyIn"] ?? 0) - Number(row["qtyOut"] ?? 0);
}

export function orgSkus(db: Record<string, Row[]>, orgId: EntityId) {
  return (db[PRODUCTS] ?? []).filter((s) => String(s["orgId"]) === String(orgId));
}

export function orgMovements(db: Record<string, Row[]>, orgId: EntityId, locationId?: EntityId) {
  const rows = (db[STOCK_MOVEMENTS] ?? []).filter((m) => String(m["orgId"]) === orgId);
  if (!locationId || locationId === "all") return rows;
  return rows.filter((m) => String(m["locationId"]) === locationId);
}

/** Remaining qty for a SKU, optionally scoped to one outlet. */
export function remainingFor(skuId: string, movements: Row[], locationId?: EntityId, sku?: Row) {
  const id = String(skuId);
  const scoped =
    locationId && locationId !== "all"
      ? movements.filter((m) => {
          const mLoc = String(m["locationId"] ?? "");
          return !mLoc || mLoc === String(locationId);
        })
      : movements;
  const matched = scoped.filter((m) => skuKey(m) === id);
  const fromMovements = Math.max(0, matched.reduce((sum, m) => sum + signedQty(m), 0));
  if (matched.length > 0) return fromMovements;
  // No ledger rows yet — fall back to inventory.stock (direct catalog edits / legacy data).
  if (!sku) return fromMovements;
  if (locationId && locationId !== "all") {
    const skuLoc = String(sku["locationId"] ?? "");
    if (skuLoc && skuLoc !== String(locationId)) return fromMovements;
  }
  return Math.max(fromMovements, Number(sku["stock"] ?? 0));
}

export function isSkuExpired(sku: Row | undefined, at = new Date()) {
  if (!sku) return false;
  const expiry = String(sku["expiry"] ?? "").trim();
  if (!expiry) return false;
  const day = at.toISOString().slice(0, 10);
  return expiry < day;
}

export function purchaseAlreadyPosted(expenseId: string, movements: Row[]) {
  const id = String(expenseId);
  if (!id) return false;
  return movements.some((m) => String(m["expenseId"]) === id && String(m["type"]) === "Purchase");
}

export function isStockPurchase(row: Row) {
  return (
    String(row["category"]) === "Purchase" &&
    String(row["status"]) === "Approved" &&
    String(row["skuId"] ?? row["sku"] ?? "") !== "" &&
    Number(row["quantity"] ?? 0) > 0
  );
}

export function skuName(skus: Row[], skuId: string | number | undefined) {
  const id = String(skuId ?? "");
  const sku = skus.find((s) => String(s.id) === id);
  return sku ? String(sku["name"]) : id;
}

export type InventoryCtx = {
  orgId: EntityId;
  locationId: EntityId;
};

export type LowStockAlert = {
  skuId: string;
  name: string;
  remaining: number;
  reorderLevel: number;
  locationId: EntityId;
  outlet: string;
  batch: string;
  expiry: string;
  expired: boolean;
};

export type InventoryValuation = {
  skuId: string;
  name: string;
  remaining: number;
  unitCost: number;
  value: number;
  locationId: EntityId;
};

function movementId(prefix: string) {
  return `SM-${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 99)}`;
}

function resolveLocation(ctx: InventoryCtx, sku?: Row) {
  if (ctx.locationId && ctx.locationId !== "all") return ctx.locationId;
  return String(sku?.["locationId"] ?? "");
}

function syncSkuCache(store: BusinessStore, sku: Row, remaining: number) {
  store.update(PRODUCTS, String(sku.id), { ...sku, stock: Math.max(0, remaining) });
}

export function listLowStockAlerts(
  db: Record<string, Row[]>,
  orgId: EntityId,
  locationId?: EntityId,
): LowStockAlert[] {
  const movements = orgMovements(db, orgId);
  const skus = orgSkus(db, orgId).filter((s) => {
    if (!locationId || locationId === "all") return true;
    return String(s["locationId"]) === locationId;
  });
  const alerts: LowStockAlert[] = [];
  const at = new Date();
  for (const sku of skus) {
    const loc = String(sku["locationId"] ?? "");
    const remaining = remainingFor(String(sku.id), movements, loc);
    const reorder = Number(sku["reorderLevel"] ?? 0);
    if (reorder <= 0 && !isSkuExpired(sku, at)) continue;
    if (remaining <= reorder || isSkuExpired(sku, at)) {
      alerts.push({
        skuId: String(sku.id),
        name: String(sku["name"] ?? sku.id),
        remaining,
        reorderLevel: reorder,
        locationId: loc,
        outlet: String(sku["outlet"] ?? ""),
        batch: String(sku["batch"] ?? ""),
        expiry: String(sku["expiry"] ?? ""),
        expired: isSkuExpired(sku, at),
      });
    }
  }
  return alerts.sort((a, b) => a.remaining - b.remaining);
}

export function inventoryValuation(
  db: Record<string, Row[]>,
  orgId: EntityId,
  locationId?: EntityId,
): { lines: InventoryValuation[]; totalValue: number } {
  const movements = orgMovements(db, orgId);
  const skus = orgSkus(db, orgId).filter((s) => {
    if (!locationId || locationId === "all") return true;
    return String(s["locationId"]) === locationId;
  });
  const lines: InventoryValuation[] = [];
  let totalValue = 0;
  for (const sku of skus) {
    const loc = String(sku["locationId"] ?? "");
    const remaining = Math.max(0, remainingFor(String(sku.id), movements, loc));
    const unitCost = Number(sku["unitCost"] ?? 0);
    const value = Math.round(remaining * unitCost);
    totalValue += value;
    lines.push({
      skuId: String(sku.id),
      name: String(sku["name"] ?? sku.id),
      remaining,
      unitCost,
      value,
      locationId: loc,
    });
  }
  return { lines, totalValue };
}

export type PostMovementInput = {
  type: StockType;
  skuId: string;
  quantity: number;
  direction?: "in" | "out";
  customerId?: string;
  expenseId?: string;
  invoiceId?: string;
  reason?: string;
  date?: string;
  batch?: string;
  expiry?: string;
  unitCost?: number;
  allowNegative?: boolean;
  balanceBefore?: number;
};

export function postStockMovement(
  store: BusinessStore,
  ctx: InventoryCtx,
  input: PostMovementInput,
): { ok: true; movement: Row } | { ok: false; error: string } {
  const skus = orgSkus(store.db, ctx.orgId);
  const sku = skus.find((s) => String(s.id) === input.skuId);
  const qty = Math.abs(Number(input.quantity) || 0);
  if (!sku || qty <= 0) return { ok: false, error: "Invalid SKU or quantity" };

  const loc = resolveLocation(ctx, sku);
  const movements = orgMovements(store.db, ctx.orgId, loc);
  const before = input.balanceBefore ?? remainingFor(input.skuId, movements, loc, sku);

  if ((input.type === "Sale" || input.type === "Used" || input.type === "Wastage") && isSkuExpired(sku)) {
    return { ok: false, error: `${String(sku["name"])} batch ${String(sku["batch"] ?? "—")} expired on ${String(sku["expiry"])}` };
  }

  const outbound =
    OUTBOUND.has(input.type) || (input.type === "Adjustment" && input.direction === "out");
  const after = before + (outbound ? -qty : qty);

  if (outbound && qty > before && !input.allowNegative) {
    return {
      ok: false,
      error: `${String(sku["name"])} is short. Need ${qty}, have ${Math.max(0, before)}.`,
    };
  }

  const date = input.date || new Date().toISOString().slice(0, 10);
  const row: Row = {
    id: movementId(input.type.slice(0, 3).toLowerCase()),
    orgId: ctx.orgId,
    locationId: loc,
    sku: input.skuId,
    skuId: input.skuId,
    skuName: String(sku["name"] ?? ""),
    type: input.type,
    quantity: qty,
    qtyIn: outbound ? 0 : qty,
    qtyOut: outbound ? qty : 0,
    customerId: input.customerId ?? "",
    expenseId: input.expenseId ?? "",
    invoiceId: input.invoiceId ?? "",
    batch: input.batch ?? String(sku["batch"] ?? ""),
    expiry: input.expiry ?? String(sku["expiry"] ?? ""),
    unitCost: input.unitCost ?? Number(sku["unitCost"] ?? 0),
    date,
    balanceBefore: before,
    balanceAfter: input.allowNegative ? after : Math.max(0, after),
    reason: input.reason ?? input.type,
    status: "Posted",
  };
  store.create(STOCK_MOVEMENTS, row);
  syncSkuCache(store, sku, remainingFor(input.skuId, [...movements, row], loc));
  return { ok: true, movement: row };
}

export function receivePurchaseExpense(
  store: BusinessStore,
  ctx: InventoryCtx,
  expense: Row,
): boolean {
  if (!isStockPurchase(expense)) return false;
  const expenseId = String(expense.id);
  const movements = orgMovements(store.db, ctx.orgId);
  if (purchaseAlreadyPosted(expenseId, movements)) {
    if (String(expense["stockPosted"]) !== "Yes") {
      store.update("expenses", expenseId, { ...expense, stockPosted: "Yes" });
    }
    return false;
  }
  const skuId = String(expense["skuId"] ?? expense["sku"] ?? "");
  const loc = String(expense["locationId"] ?? resolveLocation(ctx, orgSkus(store.db, ctx.orgId).find((s) => String(s.id) === skuId)));
  const posted = postStockMovement(store, { orgId: ctx.orgId, locationId: loc }, {
    type: "Purchase",
    skuId,
    quantity: Number(expense["quantity"] ?? 0),
    expenseId,
    reason: `Purchase ${String(expense["vendor"] ?? "")}`.trim(),
    date: String(expense["date"] ?? ""),
    batch: String(expense["batch"] ?? ""),
    expiry: String(expense["expiry"] ?? ""),
    unitCost: Number(expense["unitCost"] ?? 0) || undefined,
  });
  if (posted.ok) {
    const sku = orgSkus(store.db, ctx.orgId).find((s) => String(s.id) === skuId);
    if (sku) {
      const patch: Row = { ...sku };
      if (expense["batch"]) patch["batch"] = expense["batch"];
      if (expense["expiry"]) patch["expiry"] = expense["expiry"];
      if (expense["unitCost"]) patch["unitCost"] = expense["unitCost"];
      store.update(PRODUCTS, skuId, patch);
    }
    store.update("expenses", expenseId, { ...expense, stockPosted: "Yes" });
    return true;
  }
  return false;
}

export function postOpeningBalance(
  store: BusinessStore,
  ctx: InventoryCtx,
  sku: Row,
  quantity: number,
): boolean {
  const skuId = String(sku.id);
  const loc = String(sku["locationId"] ?? resolveLocation(ctx, sku));
  const movements = orgMovements(store.db, ctx.orgId, loc);
  const already = movements.some((m) => skuKey(m) === skuId && String(m["type"]) === "Opening");
  if (already || quantity <= 0) return false;
  const posted = postStockMovement(store, { orgId: ctx.orgId, locationId: loc }, {
    type: "Opening",
    skuId,
    quantity,
    reason: "Opening balance",
    date: String(sku["createdon"] ?? new Date().toISOString().slice(0, 10)),
  });
  return posted.ok;
}

export function recordStockAdjustment(
  store: BusinessStore,
  ctx: InventoryCtx,
  input: {
    skuId: string;
    quantity: number;
    direction: "in" | "out";
    reason: string;
    date?: string;
  },
) {
  const type: StockType = "Adjustment";
  const qty = Math.abs(input.quantity);
  const signed = input.direction === "out" ? -qty : qty;
  const sku = orgSkus(store.db, ctx.orgId).find((s) => String(s.id) === input.skuId);
  const loc = resolveLocation(ctx, sku);
  const movements = orgMovements(store.db, ctx.orgId, loc);
  const before = remainingFor(input.skuId, movements, loc, sku);
  if (signed < 0 && qty > before) {
    return { ok: false as const, error: `Cannot adjust out ${qty} — only ${before} on hand.` };
  }
  const result = postStockMovement(store, { orgId: ctx.orgId, locationId: loc }, {
    type,
    skuId: input.skuId,
    quantity: qty,
    direction: input.direction,
    reason: input.reason,
    date: input.date,
    allowNegative: false,
    balanceBefore: before,
  });
  if (!result.ok) return result;
  emitBusinessEvent(store, {
    type: "STOCK_ADJUSTED",
    orgId: ctx.orgId,
    locationId: loc,
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    entityId: String(result.movement.id),
    payload: { skuId: input.skuId, quantity: signed, reason: input.reason },
  });
  return result;
}

export function recordWastage(
  store: BusinessStore,
  ctx: InventoryCtx,
  input: { skuId: string; quantity: number; reason: string; date?: string },
) {
  const loc = resolveLocation(ctx, orgSkus(store.db, ctx.orgId).find((s) => String(s.id) === input.skuId));
  return postStockMovement(store, { orgId: ctx.orgId, locationId: loc }, {
    type: "Wastage",
    skuId: input.skuId,
    quantity: input.quantity,
    reason: input.reason,
    date: input.date,
  });
}

export function recordStockReturn(
  store: BusinessStore,
  ctx: InventoryCtx,
  input: { skuId: string; quantity: number; reason: string; customerId?: string; date?: string },
) {
  const loc = resolveLocation(ctx, orgSkus(store.db, ctx.orgId).find((s) => String(s.id) === input.skuId));
  return postStockMovement(store, { orgId: ctx.orgId, locationId: loc }, {
    type: "Return",
    skuId: input.skuId,
    quantity: input.quantity,
    reason: input.reason,
    customerId: input.customerId,
    date: input.date,
  });
}

export function assertCanIssueStock(
  db: Record<string, Row[]>,
  orgId: EntityId,
  locationId: EntityId,
  lines: { id: string; kind: string; qty: number; name: string }[],
): string | null {
  const movements = orgMovements(db, orgId, locationId === "all" ? undefined : locationId);
  const services = (db["services"] ?? []).filter((s) => String(s["orgId"]) === String(orgId));
  const recipes = (db[SERVICE_PRODUCTS] ?? []).filter((r) => String(r["orgId"]) === String(orgId));
  const skus = orgSkus(db, orgId);
  const missing = missingProducts(lines, { services, recipes, skus, movements, locationId });
  const expired: MissingProduct[] = [];
  const at = new Date();
  for (const sku of skus) {
    if (!isSkuExpired(sku, at)) continue;
    const id = String(sku.id);
    const productQty = lines.filter((l) => l.kind === "product" && l.id === id).reduce((s, l) => s + l.qty, 0);
    const recipeQty = recipeDemand(lines, services, recipes).get(id) ?? 0;
    if (productQty + recipeQty > 0) {
      expired.push({
        skuId: id,
        name: String(sku["name"]),
        need: productQty + recipeQty,
        have: 0,
      });
    }
  }
  if (expired.length) {
    return expired.map((e) => `${e.name} is expired (${String(skus.find((s) => String(s.id) === e.skuId)?.["expiry"])}).`).join(" ");
  }
  return missingMessage(missing);
}

export function issueStockForSale(
  store: BusinessStore,
  ctx: InventoryCtx,
  lines: { id: string; kind: string; qty: number; name: string }[],
  saleCtx: { customerId: EntityId; invoiceId: EntityId; date: string },
): Row[] {
  const skus = orgSkus(store.db, ctx.orgId);
  const services = (store.db["services"] ?? []).filter((s) => String(s["orgId"]) === ctx.orgId);
  const recipes = (store.db[SERVICE_PRODUCTS] ?? []).filter((r) => String(r["orgId"]) === ctx.orgId);
  const loc = ctx.locationId === "all" ? "" : ctx.locationId;
  const movements = orgMovements(store.db, ctx.orgId, loc || undefined);
  const running: Record<string, number> = {};
  const posted: Row[] = [];

  const balanceOf = (skuId: string) => running[skuId] ?? remainingFor(skuId, movements, loc || undefined);

  for (const line of lines.filter((l) => l.kind === "product")) {
    const sku = skus.find((s) => String(s.id) === line.id);
    if (!sku) continue;
    const before = balanceOf(line.id);
    const type: StockType = Number(sku["sellPrice"] ?? 0) > 0 ? "Sale" : "Used";
    const result = postStockMovement(store, { orgId: ctx.orgId, locationId: loc || String(sku["locationId"]) }, {
      type,
      skuId: line.id,
      quantity: line.qty,
      customerId: saleCtx.customerId,
      invoiceId: saleCtx.invoiceId,
      reason: type === "Sale" ? "POS sale to customer" : "Used on customer",
      date: saleCtx.date,
      balanceBefore: before,
    });
    if (result.ok) {
      posted.push(result.movement);
      running[line.id] = before - line.qty;
    }
  }

  for (const [skuId, qty] of recipeDemand(lines, services, recipes)) {
    const sku = skus.find((s) => String(s.id) === skuId);
    if (!sku || qty <= 0) continue;
    const before = balanceOf(skuId);
    const result = postStockMovement(store, { orgId: ctx.orgId, locationId: loc || String(sku["locationId"]) }, {
      type: "Used",
      skuId,
      quantity: qty,
      customerId: saleCtx.customerId,
      invoiceId: saleCtx.invoiceId,
      reason: "Used for service",
      date: saleCtx.date,
      balanceBefore: before,
    });
    if (result.ok) {
      posted.push(result.movement);
      running[skuId] = before - qty;
    }
  }
  return posted;
}

export function customerProductHistory(customerId: EntityId, movements: Row[], skus: Row[]) {
  const grouped = new Map<string, { skuId: string; name: string; sold: number; used: number }>();
  for (const m of movements) {
    if (String(m["customerId"] ?? "") !== customerId) continue;
    const type = String(m["type"]);
    if (type !== "Sale" && type !== "Used") continue;
    const id = skuKey(m);
    const qty = Math.abs(signedQty(m));
    const prev = grouped.get(id) ?? {
      skuId: id,
      name: String(m["skuName"] ?? skuName(skus, id)),
      sold: 0,
      used: 0,
    };
    if (type === "Sale") prev.sold += qty;
    else prev.used += qty;
    grouped.set(id, prev);
  }
  return [...grouped.values()];
}
