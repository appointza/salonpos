import { emitBusinessEvent, onBusinessEvent } from "@/lib/business/event-bus";
import { listLowStockAlerts } from "@/lib/business/inventory-service";
import { AUDIT } from "@/lib/pos";

let registered = false;

/** Register cross-module reactions to domain events (CRM hooks, analytics, etc.). */
export function registerBusinessHandlers() {
  if (registered) return;
  registered = true;

  onBusinessEvent("SALE_COMPLETED", (store, event) => {
    store.create(AUDIT, {
      id: `AU-${Date.now()}-sale`,
      at: event.at,
      entity: "BusinessEvent",
      reference: event.entityId,
      action: "SaleCompleted",
      detail: `Customer ${event.customerId ?? "—"} · event bus`,
      locationId: event.locationId,
      orgId: event.orgId,
    });
  });

  onBusinessEvent("STOCK_CONSUMED", (store, event) => {
    const alerts = listLowStockAlerts(store.db, event.orgId, event.locationId);
    for (const alert of alerts.slice(0, 5)) {
      store.create(AUDIT, {
        id: `AU-${Date.now()}-stock-${alert.skuId}`,
        at: event.at,
        entity: "Inventory",
        reference: alert.skuId,
        action: alert.expired ? "ExpiredStock" : "LowStock",
        detail: `${alert.name} · ${alert.remaining} left (reorder ${alert.reorderLevel})`,
        locationId: event.locationId,
        orgId: event.orgId,
      });
    }
    if (alerts.length > 0) {
      emitBusinessEvent(store, {
        type: "STOCK_LOW",
        orgId: event.orgId,
        locationId: event.locationId,
        at: event.at,
        entityId: event.entityId,
        payload: { alertCount: alerts.length },
      });
    }
  });

  onBusinessEvent("STOCK_ADJUSTED", (store, event) => {
    store.create(AUDIT, {
      id: `AU-${Date.now()}-adj`,
      at: event.at,
      entity: "Inventory",
      reference: event.entityId,
      action: "StockAdjusted",
      detail: String(event.payload?.reason ?? "Adjustment"),
      locationId: event.locationId,
      orgId: event.orgId,
    });
  });

  onBusinessEvent("APPOINTMENT_COMPLETED", (store, event) => {
    store.create(AUDIT, {
      id: `AU-${Date.now()}-appt`,
      at: event.at,
      entity: "BusinessEvent",
      reference: event.entityId,
      action: "AppointmentCompleted",
      detail: `Invoice ${String(event.payload?.invoiceId ?? "")}`,
      locationId: event.locationId,
      orgId: event.orgId,
    });
  });
}
