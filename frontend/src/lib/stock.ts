import { useCallback, useMemo } from "react";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { missingMessage, missingProducts, recipeDemand, SERVICE_PRODUCTS } from "@/lib/service-recipe";

export const STOCK_MOVEMENTS = "stockMovements";
export const PRODUCTS = "inventory";

export type StockType = "Opening" | "Purchase" | "Sale" | "Used";

export function skuKey(row: Row) {
  return String(row["skuId"] ?? row["sku"] ?? row.id ?? "");
}

/** Signed quantity: Opening/Purchase add, Sale/Used subtract. */
export function signedQty(row: Row) {
  const type = String(row["type"] ?? "");
  const explicit = row["quantity"];
  if (explicit !== undefined && explicit !== "") {
    const q = Math.abs(Number(explicit) || 0);
    if (type === "Sale" || type === "Used") return -q;
    return q;
  }
  return Number(row["qtyIn"] ?? 0) - Number(row["qtyOut"] ?? 0);
}

export function orgMovements(db: Record<string, Row[]>, orgId: string) {
  return (db[STOCK_MOVEMENTS] ?? []).filter((m) => String(m["orgId"]) === orgId);
}

export function remainingFor(skuId: string, movements: Row[]) {
  const id = String(skuId);
  return Math.max(
    0,
    movements.filter((m) => skuKey(m) === id).reduce((sum, m) => sum + signedQty(m), 0),
  );
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

export function customerProductHistory(customerId: string, movements: Row[], skus: Row[]) {
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

function movementId(prefix: string) {
  return `SM-${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 99)}`;
}

export function useStockService() {
  const { allRows, create, update, orgId } = useData();
  const { locationId, org } = useTenant();

  const movements = useMemo(() => orgMovements(allRows, orgId), [allRows, orgId]);
  const recipes = useMemo(
    () => (allRows[SERVICE_PRODUCTS] ?? []).filter((r) => String(r["orgId"]) === orgId),
    [allRows, orgId],
  );
  const services = useMemo(
    () => (allRows["services"] ?? []).filter((s) => String(s["orgId"]) === orgId),
    [allRows, orgId],
  );
  const skus = useMemo(
    () => (allRows[PRODUCTS] ?? []).filter((s) => String(s["orgId"]) === orgId),
    [allRows, orgId],
  );

  const remaining = useCallback((skuId: string) => remainingFor(String(skuId), movements), [movements]);

  const syncCache = useCallback(
    (skuId: string, nextRemaining: number) => {
      const sku = skus.find((s) => String(s.id) === skuId);
      if (sku) update(PRODUCTS, skuId, { ...sku, stock: nextRemaining });
    },
    [skus, update],
  );

  const post = useCallback(
    (input: {
      type: StockType;
      skuId: string;
      quantity: number;
      customerId?: string;
      expenseId?: string;
      invoiceId?: string;
      reason?: string;
      date?: string;
      location?: string;
      balanceBefore?: number;
    }) => {
      const sku = skus.find((s) => String(s.id) === input.skuId);
      const qty = Math.abs(Number(input.quantity) || 0);
      if (!sku || qty <= 0) return null;
      const before = input.balanceBefore ?? remainingFor(input.skuId, movements);
      const signed = input.type === "Sale" || input.type === "Used" ? -qty : qty;
      const after = Math.max(0, before + signed);
      const loc =
        input.location ||
        (locationId === "all" ? String(sku["locationId"] ?? org.locations[0]?.locationId ?? "") : locationId);
      const date = input.date || new Date().toISOString().slice(0, 10);
      const row: Row = {
        id: movementId(input.type.slice(0, 3).toLowerCase()),
        sku: input.skuId,
        skuId: input.skuId,
        skuName: String(sku["name"] ?? ""),
        type: input.type,
        quantity: qty,
        qtyIn: signed > 0 ? qty : 0,
        qtyOut: signed < 0 ? qty : 0,
        customerId: input.customerId ?? "",
        expenseId: input.expenseId ?? "",
        invoiceId: input.invoiceId ?? "",
        date,
        balanceBefore: before,
        balanceAfter: after,
        reason: input.reason ?? input.type,
        status: "Posted",
        locationId: loc,
      };
      create(STOCK_MOVEMENTS, row);
      syncCache(input.skuId, after);
      return row;
    },
    [skus, movements, create, syncCache, locationId, org.locations],
  );

  const receivePurchase = useCallback(
    (expense: Row) => {
      if (!isStockPurchase(expense)) return false;
      const expenseId = String(expense.id);
      if (purchaseAlreadyPosted(expenseId, movements)) {
        if (String(expense["stockPosted"]) !== "Yes") update("expenses", expenseId, { ...expense, stockPosted: "Yes" });
        return false;
      }
      const skuId = String(expense["skuId"] ?? expense["sku"] ?? "");
      const posted = post({
        type: "Purchase",
        skuId,
        quantity: Number(expense["quantity"] ?? 0),
        expenseId,
        reason: `Purchase ${String(expense["vendor"] ?? "")}`.trim(),
        date: String(expense["date"] ?? ""),
        location: String(expense["locationId"] ?? ""),
      });
      if (posted) update("expenses", expenseId, { ...expense, stockPosted: "Yes" });
      return Boolean(posted);
    },
    [movements, post, update],
  );

  const assertCanIssue = useCallback(
    (lines: { id: string; kind: string; qty: number; name: string }[]) => {
      return missingMessage(missingProducts(lines, { services, recipes, skus, movements }));
    },
    [services, recipes, skus, movements],
  );

  const issueForCustomer = useCallback(
    (
      lines: { id: string; kind: string; qty: number; name: string }[],
      ctx: { customerId: string; invoiceId: string; locationId: string; date: string },
    ) => {
      const running: Record<string, number> = {};
      const posted: Row[] = [];
      for (const line of lines.filter((l) => l.kind === "product")) {
        const sku = skus.find((s) => String(s.id) === line.id);
        if (!sku) continue;
        const before = running[line.id] ?? remaining(line.id);
        if (line.qty > before) continue;
        const type: StockType = Number(sku["sellPrice"] ?? 0) > 0 ? "Sale" : "Used";
        const row = post({
          type,
          skuId: line.id,
          quantity: line.qty,
          customerId: ctx.customerId,
          invoiceId: ctx.invoiceId,
          reason: type === "Sale" ? "POS sale to customer" : "Used on customer",
          date: ctx.date,
          location: ctx.locationId,
          balanceBefore: before,
        });
        if (row) posted.push(row);
        running[line.id] = before - line.qty;
      }
      for (const [skuId, qty] of recipeDemand(lines, services, recipes)) {
        const sku = skus.find((s) => String(s.id) === skuId);
        if (!sku || qty <= 0) continue;
        const before = running[skuId] ?? remaining(skuId);
        if (qty > before) continue;
        const row = post({
          type: "Used",
          skuId,
          quantity: qty,
          customerId: ctx.customerId,
          invoiceId: ctx.invoiceId,
          reason: "Used for service",
          date: ctx.date,
          location: ctx.locationId,
          balanceBefore: before,
        });
        if (row) posted.push(row);
        running[skuId] = before - qty;
      }
      return posted;
    },
    [skus, remaining, post, services, recipes],
  );

  return {
    movements,
    skus,
    recipes,
    services,
    remaining,
    receivePurchase,
    assertCanIssue,
    issueForCustomer,
    historyFor: (customerId: string) => customerProductHistory(customerId, movements, skus),
  };
}
