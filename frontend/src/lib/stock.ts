import { useCallback, useMemo } from "react";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { SERVICE_PRODUCTS } from "@/lib/service-recipe";
import {
  assertCanIssueStock,
  customerProductHistory,
  issueStockForSale,
  orgMovements,
  PRODUCTS,
  receivePurchaseExpense,
  remainingFor,
  signedQty,
  skuKey,
  skuName,
  STOCK_MOVEMENTS,
  purchaseAlreadyPosted,
  isStockPurchase,
  postOpeningBalance,
  recordStockAdjustment,
  recordWastage,
  recordStockReturn,
  listLowStockAlerts,
  inventoryValuation,
  type StockType,
} from "@/lib/business/inventory-service";

export {
  STOCK_MOVEMENTS,
  PRODUCTS,
  signedQty,
  skuKey,
  orgMovements,
  remainingFor,
  purchaseAlreadyPosted,
  isStockPurchase,
  skuName,
  customerProductHistory,
  listLowStockAlerts,
  inventoryValuation,
  recordStockAdjustment,
  recordWastage,
  recordStockReturn,
  postOpeningBalance,
};
export type { StockType };

export function useStockService() {
  const { allRows, create, update, orgId } = useData();
  const { locationId, org } = useTenant();

  const movements = useMemo(
    () => orgMovements(allRows, orgId, locationId === "all" ? undefined : locationId),
    [allRows, orgId, locationId],
  );
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

  const effLocation = locationId === "all" ? "all" : locationId;

  const remaining = useCallback(
    (skuId: string) => remainingFor(String(skuId), orgMovements(allRows, orgId), effLocation === "all" ? undefined : effLocation),
    [allRows, orgId, effLocation],
  );

  const store = useMemo(() => ({ db: allRows, create, update }), [allRows, create, update]);
  const invCtx = useMemo(() => ({ orgId, locationId: effLocation }), [orgId, effLocation]);

  const receivePurchase = useCallback(
    (expense: Row) => receivePurchaseExpense(store, invCtx, expense),
    [store, invCtx],
  );

  const assertCanIssue = useCallback(
    (lines: { id: string; kind: string; qty: number; name: string }[]) =>
      assertCanIssueStock(allRows, orgId, effLocation, lines),
    [allRows, orgId, effLocation],
  );

  const issueForCustomer = useCallback(
    (
      lines: { id: string; kind: string; qty: number; name: string }[],
      ctx: { customerId: string; invoiceId: string; locationId: string; date: string },
    ) =>
      issueStockForSale(store, { orgId, locationId: ctx.locationId }, lines, {
        customerId: ctx.customerId,
        invoiceId: ctx.invoiceId,
        date: ctx.date,
      }),
    [store, orgId],
  );

  const adjust = useCallback(
    (input: { skuId: string; quantity: number; direction: "in" | "out"; reason: string }) =>
      recordStockAdjustment(store, invCtx, input),
    [store, invCtx],
  );

  const wastage = useCallback(
    (input: { skuId: string; quantity: number; reason: string }) => recordWastage(store, invCtx, input),
    [store, invCtx],
  );

  const returnStock = useCallback(
    (input: { skuId: string; quantity: number; reason: string; customerId?: string }) =>
      recordStockReturn(store, invCtx, input),
    [store, invCtx],
  );

  const lowStock = useMemo(
    () => listLowStockAlerts(allRows, orgId, effLocation === "all" ? undefined : effLocation),
    [allRows, orgId, effLocation],
  );

  const valuation = useMemo(
    () => inventoryValuation(allRows, orgId, effLocation === "all" ? undefined : effLocation),
    [allRows, orgId, effLocation],
  );

  const openSku = useCallback(
    (sku: Row, quantity: number) => postOpeningBalance(store, invCtx, sku, quantity),
    [store, invCtx],
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
    adjust,
    wastage,
    returnStock,
    lowStock,
    valuation,
    openSku,
    historyFor: (customerId: string) =>
      customerProductHistory(customerId, orgMovements(allRows, orgId), skus),
  };
}
