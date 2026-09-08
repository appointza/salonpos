import type { Db, Row } from "@/lib/store";
import { findCustomerByPhone, getCustomerById, normalizePhone } from "@/lib/customers/customer-lookup";

export type CustomerStore = {
  db: Db;
  create: (collection: string, row: Row, orgOverride?: string) => void;
  update: (collection: string, id: string, row: Row) => void;
};

export type UpsertCustomerInput = {
  orgId: string;
  name: string;
  phone: string;
  locationId: string;
  outlet: string;
  membershipId?: string;
  lastVisit?: string;
  extra?: Record<string, string | number>;
};

/** Find or create a customer by normalized phone within an org. */
export function upsertCustomerByPhone(store: CustomerStore, input: UpsertCustomerInput): Row {
  const pool = (store.db["customers"] ?? []).filter((c) => String(c["orgId"]) === input.orgId);
  const existing = findCustomerByPhone(pool, input.phone);
  if (existing) {
    const next: Row = {
      ...existing,
      name: input.name.trim() || String(existing["name"]),
      phone: input.phone,
      ...(input.membershipId !== undefined ? { membershipId: input.membershipId } : {}),
      ...(input.lastVisit ? { lastVisit: input.lastVisit } : {}),
      ...input.extra,
    };
    store.update("customers", String(existing.id), next);
    return next;
  }
  const row: Row = {
    id: `C-${Math.floor(1000 + Math.random() * 8999)}`,
    name: input.name.trim(),
    phone: input.phone,
    tier: "Silver",
    points: 0,
    walletBalance: 0,
    membershipId: input.membershipId ?? "",
    outlet: input.outlet,
    lastVisit: input.lastVisit ?? "",
    locationId: input.locationId,
    totalVisits: 0,
    stampsCurrent: 0,
    ...input.extra,
  };
  store.create("customers", row, input.orgId);
  return row;
}

export function incrementTotalVisits(store: CustomerStore, customerId: string, lastVisit?: string) {
  const customer = getCustomerById(store.db, customerId);
  if (!customer) return null;
  const today = lastVisit ?? new Date().toISOString().slice(0, 10);
  const visits = Number(customer["totalVisits"] ?? customer["visits"] ?? 0) + 1;
  const next: Row = {
    ...customer,
    totalVisits: visits,
    visits,
    lastVisit: today,
  };
  store.update("customers", customerId, next);
  return next;
}

export function patchCustomer(store: CustomerStore, customerId: string, patch: Record<string, string | number>) {
  const customer = getCustomerById(store.db, customerId);
  if (!customer) return null;
  const next = { ...customer, ...patch };
  store.update("customers", customerId, next);
  return next;
}

export function isValidPhone(phone: string) {
  return normalizePhone(phone).length >= 10;
}
