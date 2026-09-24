import type { EntityId } from "@/lib/ids";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useData, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { SERVICE_PRODUCTS } from "@/lib/service-recipe";
import { inventoryService } from "@/services/inventory.service";
import { stockMovementService } from "@/services/stockMovement.service";
import {
  customerProductHistory,
  orgMovements,
  PRODUCTS,
  receivePurchaseExpense,
  signedQty,
  skuKey,
  skuName,
  STOCK_MOVEMENTS,
  purchaseAlreadyPosted,
  isStockPurchase,
  postOpeningBalance,
  recordWastage,
  recordStockReturn,
  listLowStockAlerts,
  inventoryValuation,
  type StockType,
} from "@/lib/business/inventory-service";
import type { InventoryAvailabilityLine, InventoryMissingProduct } from "@/model/inventory";

export {
  STOCK_MOVEMENTS,
  PRODUCTS,
  signedQty,
  skuKey,
  orgMovements,
  purchaseAlreadyPosted,
  isStockPurchase,
  skuName,
  customerProductHistory,
  listLowStockAlerts,
  inventoryValuation,
  recordWastage,
  recordStockReturn,
  postOpeningBalance,
};
export type { StockType, InventoryMissingProduct };

export function useStockService() {
  const { allRows, create, update, orgId, reload } = useData();
  const { locationId } = useTenant();
  const [remainingMap, setRemainingMap] = useState<Record<string, number>>({});
  const [remainingLoading, setRemainingLoading] = useState(false);

  const effLocation = locationId === "all" ? 0 : Number(locationId) || 0;
  const oid = Number(orgId) || 0;

  const movements = useMemo(
    () => orgMovements(allRows, orgId, locationId === "all" ? undefined : locationId),
    [allRows, orgId, locationId],
  );
  const recipes = useMemo(
    () => (allRows[SERVICE_PRODUCTS] ?? []).filter((r) => String(r["orgId"]) === String(orgId)),
    [allRows, orgId],
  );
  const services = useMemo(
    () => (allRows["services"] ?? []).filter((s) => String(s["orgId"]) === String(orgId)),
    [allRows, orgId],
  );
  const skus = useMemo(
    () => (allRows[PRODUCTS] ?? []).filter((s) => String(s["orgId"]) === String(orgId)),
    [allRows, orgId],
  );

  const refreshRemaining = useCallback(async () => {
    if (!oid) {
      setRemainingMap({});
      return;
    }
    setRemainingLoading(true);
    try {
      const res = await inventoryService.remaining({ orgId: oid, locationId: effLocation, skuId: 0 });
      const map: Record<string, number> = {};
      for (const row of res.rows ?? []) {
        map[String(row.skuId)] = Number(row.remaining ?? 0);
      }
      setRemainingMap(map);
    } catch {
      setRemainingMap({});
    } finally {
      setRemainingLoading(false);
    }
  }, [oid, effLocation]);

  useEffect(() => {
    void refreshRemaining();
  }, [refreshRemaining]);

  const remaining = useCallback(
    (skuId: string) => remainingMap[String(skuId)] ?? 0,
    [remainingMap],
  );

  const store = useMemo(() => ({ db: allRows, create, update }), [allRows, create, update]);
  const invCtx = useMemo(
    () => ({ orgId, locationId: locationId === "all" ? "all" : locationId }),
    [orgId, locationId],
  );

  const receivePurchase = useCallback(
    (expense: Row) => receivePurchaseExpense(store, invCtx, expense),
    [store, invCtx],
  );

  const checkAvailability = useCallback(
    async (lines: { id: string; kind: string; qty: number; name: string }[]) => {
      if (!oid) return { ok: false, errorMessage: "No organization", missing: [] as InventoryMissingProduct[] };
      const apiLines: InventoryAvailabilityLine[] = lines.map((l) => ({
        id: Number(l.id) || 0,
        kind: l.kind,
        name: l.name,
        qty: l.qty,
      }));
      const res = await inventoryService.checkAvailability({
        orgId: oid,
        locationId: effLocation,
        lines: apiLines,
      });
      return {
        ok: res.ok,
        errorMessage: res.errorMessage ?? "",
        missing: res.missing ?? [],
      };
    },
    [oid, effLocation],
  );

  const assertCanIssue = useCallback(
    async (lines: { id: string; kind: string; qty: number; name: string }[]) => {
      const res = await checkAvailability(lines);
      return res.ok ? null : res.errorMessage || "Insufficient stock";
    },
    [checkAvailability],
  );

  const adjust = useCallback(
    async (input: { skuId: string; quantity: number; direction: "in" | "out"; reason: string }) => {
      if (!oid) return { ok: false as const, error: "No organization" };
      try {
        const res = await stockMovementService.adjust({
          orgId: oid,
          locationId: effLocation,
          skuId: Number(input.skuId) || 0,
          quantity: input.quantity,
          direction: input.direction,
          reason: input.reason,
          date: new Date().toISOString().slice(0, 10),
        });
        if (!res.ok) return { ok: false as const, error: res.errorMessage || "Could not adjust stock" };
        await reload();
        await refreshRemaining();
        return { ok: true as const, remainingAfter: res.remainingAfter };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Could not adjust stock" };
      }
    },
    [oid, effLocation, reload, refreshRemaining],
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
    () => listLowStockAlerts(allRows, orgId, locationId === "all" ? undefined : locationId),
    [allRows, orgId, locationId],
  );

  const valuation = useMemo(
    () => inventoryValuation(allRows, orgId, locationId === "all" ? undefined : locationId),
    [allRows, orgId, locationId],
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
    remainingLoading,
    refreshRemaining,
    receivePurchase,
    checkAvailability,
    assertCanIssue,
    adjust,
    wastage,
    returnStock,
    lowStock,
    valuation,
    openSku,
    historyFor: (customerId: EntityId) =>
      customerProductHistory(customerId, orgMovements(allRows, orgId), skus),
  };
}
