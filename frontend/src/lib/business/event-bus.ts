import type { Row } from "@/lib/store";
import type { BusinessEvent, BusinessEventType, BusinessStore } from "@/lib/business/types";
import { BUSINESS_EVENTS } from "@/lib/business/types";

export type BusinessEventHandler = (store: BusinessStore, event: BusinessEvent) => void;

const handlers = new Map<BusinessEventType, BusinessEventHandler[]>();

export function onBusinessEvent(type: BusinessEventType, handler: BusinessEventHandler) {
  const list = handlers.get(type) ?? [];
  list.push(handler);
  handlers.set(type, list);
}

export function emitBusinessEvent(store: BusinessStore, event: BusinessEvent) {
  const row: Row = {
    id: `BE-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    orgId: event.orgId,
    locationId: event.locationId,
    type: event.type,
    entityId: event.entityId,
    customerId: event.customerId ?? "",
    at: event.at,
    payload: JSON.stringify(event.payload ?? {}),
  };
  store.create(BUSINESS_EVENTS, row);

  for (const handler of handlers.get(event.type) ?? []) {
    handler(store, event);
  }
}
