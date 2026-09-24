import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";
import { findCustomerByPhoneInOrg, getCustomerById, normalizePhone } from "@/lib/customers/customer-lookup";
import { readRewardDistribution, rollCustomerTier } from "@/lib/reward-distribution";

export type CustomerStore = {
  db: Db;
  create: (collection: string, row: Row, orgOverride?: string | number) => Promise<Row | void> | void;
  update: (collection: string, id: string | number, row: Row) => Promise<void> | void;
};

export type UpsertCustomerInput = {
  orgId: EntityId;
  name: string;
  phone: string;
  locationId: EntityId;
  outlet: string;
  membershipId?: string;
  lastVisit?: string;
  extra?: Record<string, string | number>;
};

/** Find or create a customer by phone in the organisation. An existing phone is reused; the visit is recorded on that profile. */
export async function upsertCustomerByPhone(store: CustomerStore, input: UpsertCustomerInput): Promise<Row> {
  const existing = findCustomerByPhoneInOrg(
    store.db["customers"] ?? [],
    input.phone,
    input.orgId,
    input.locationId,
    input.outlet,
  );
  if (existing) {
    const next: Row = {
      ...existing,
      name: input.name.trim() || String(existing["name"]),
      phone: normalizePhone(input.phone) || String(existing["phone"] ?? ""),
      ...(input.membershipId !== undefined ? { membershipId: input.membershipId } : {}),
      ...(input.lastVisit ? { lastVisit: input.lastVisit } : {}),
      ...input.extra,
    };
    void store.update("customers", String(existing.id), next);
    return next;
  }
  const orgRow = (store.db["organizations"] ?? []).find((o) => String(o["orgId"]) === String(input.orgId));
  const tierWeights = readRewardDistribution(orgRow).customerTier;
  const row: Row = {
    id: 0,
    name: input.name.trim(),
    phone: normalizePhone(input.phone) || input.phone,
    tier: rollCustomerTier(tierWeights),
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
  const saved = await store.create("customers", row, input.orgId);
  if (!saved || saved.id === undefined || saved.id === null || Number(saved.id) <= 0) {
    throw new Error("Could not save customer");
  }
  return saved;
}

export function incrementTotalVisits(store: CustomerStore, customerId: EntityId, lastVisit?: string) {
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

export function patchCustomer(store: CustomerStore, customerId: EntityId, patch: Record<string, string | number>) {
  const customer = getCustomerById(store.db, customerId);
  if (!customer) return null;
  const next = { ...customer, ...patch };
  store.update("customers", customerId, next);
  return next;
}

export function isValidPhone(phone: string) {
  return normalizePhone(phone).length >= 10;
}
