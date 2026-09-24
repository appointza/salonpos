import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";

/** Last 10 digits — canonical phone key for India mobiles. */
export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

/** Customers belong to one organisation. The same phone is one profile; a visit records a service on that profile. */
export function customersForOutlet(
  customers: Row[],
  orgId: EntityId | number,
  locationId?: EntityId | number | "all",
) {
  return customers.filter((c) => {
    if (String(c["orgId"]) !== String(orgId)) return false;
    if (!locationId || locationId === "all") return true;
    return String(c["locationId"]) === String(locationId);
  });
}

export function customersForOrg(db: Db, orgId: EntityId) {
  return customersForOutlet(db["customers"] ?? [], orgId);
}

/**
 * Find customer by phone within an outlet scope.
 * Pass locationId to match the org+outlet profile used for POS, walk-in and bookings.
 */
export function findCustomerByPhone(customers: Row[], phone: string, locationId?: EntityId | number | "all") {
  const digits = normalizePhone(phone);
  if (digits.length < 10) return null;
  const pool =
    locationId !== undefined && locationId !== null && locationId !== "" && locationId !== "all"
      ? customers.filter((c) => String(c["locationId"]) === String(locationId))
      : customers;
  return pool.find((c) => normalizePhone(String(c["phone"] ?? "")) === digits) ?? null;
}

/** One phone is one customer in the organisation. Prefer the profile at this outlet, then the one with loyalty points. */
export function findCustomerByPhoneInOrg(
  customers: Row[],
  phone: string,
  orgId: EntityId | number,
  locationId?: EntityId | number | "all",
  outlet?: string,
) {
  const digits = normalizePhone(phone);
  if (digits.length < 10) return null;
  const matches = customers.filter(
    (c) => String(c["orgId"]) === String(orgId) && normalizePhone(String(c["phone"] ?? "")) === digits,
  );
  if (matches.length === 0) return null;
  const outletName = (outlet ?? "").trim().toLowerCase();
  return [...matches].sort((a, b) => {
    const aLoc = locationId && locationId !== "all" && String(a["locationId"]) === String(locationId) ? 1 : 0;
    const bLoc = locationId && locationId !== "all" && String(b["locationId"]) === String(locationId) ? 1 : 0;
    if (aLoc !== bLoc) return bLoc - aLoc;
    const aOut = outletName && String(a["outlet"] ?? "").trim().toLowerCase() === outletName ? 1 : 0;
    const bOut = outletName && String(b["outlet"] ?? "").trim().toLowerCase() === outletName ? 1 : 0;
    if (aOut !== bOut) return bOut - aOut;
    const points = Number(b["points"] ?? 0) - Number(a["points"] ?? 0);
    if (points !== 0) return points;
    return String(b["lastVisit"] ?? "").localeCompare(String(a["lastVisit"] ?? ""));
  })[0];
}

/** Keep one row per phone so repeat visits do not show as extra customers. */
export function collapseCustomersByPhone(customers: Row[]) {
  const best = new Map<string, Row>();
  for (const row of customers) {
    const digits = normalizePhone(String(row["phone"] ?? ""));
    const key = digits.length >= 10 ? digits : `id:${row.id}`;
    const current = best.get(key);
    if (!current) {
      best.set(key, row);
      continue;
    }
    const points = Number(row["points"] ?? 0) - Number(current["points"] ?? 0);
    const visits = Number(row["totalVisits"] ?? 0) - Number(current["totalVisits"] ?? 0);
    const newer = String(row["lastVisit"] ?? "").localeCompare(String(current["lastVisit"] ?? ""));
    if (points > 0 || (points === 0 && visits > 0) || (points === 0 && visits === 0 && newer > 0)) best.set(key, row);
  }
  return [...best.values()];
}

export function hasDuplicatePhoneAtOutlet(
  customers: Row[],
  phone: string,
  orgId: EntityId | number,
  locationId: EntityId | number,
  excludeId?: string | number,
) {
  const digits = normalizePhone(phone);
  if (digits.length < 10) return false;
  return customersForOutlet(customers, orgId, locationId).some((c) => {
    if (excludeId !== undefined && String(c.id) === String(excludeId)) return false;
    return normalizePhone(String(c["phone"] ?? "")) === digits;
  });
}

export function getCustomerById(db: Db, customerId: EntityId) {
  return (db["customers"] ?? []).find((c) => String(c.id) === String(customerId)) ?? null;
}

export function customerName(db: Db, customerId: EntityId) {
  return String(getCustomerById(db, customerId)?.["name"] ?? customerId);
}
