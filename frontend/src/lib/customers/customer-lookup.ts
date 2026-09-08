import type { Db, Row } from "@/lib/store";

/** Last 10 digits — canonical phone key for India mobiles. */
export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export function findCustomerByPhone(customers: Row[], phone: string) {
  const digits = normalizePhone(phone);
  if (digits.length < 10) return null;
  return customers.find((c) => normalizePhone(String(c["phone"] ?? "")) === digits) ?? null;
}

export function getCustomerById(db: Db, customerId: string) {
  return (db["customers"] ?? []).find((c) => String(c.id) === customerId) ?? null;
}

export function customerName(db: Db, customerId: string) {
  return String(getCustomerById(db, customerId)?.["name"] ?? customerId);
}

export function customersForOrg(db: Db, orgId: string) {
  return (db["customers"] ?? []).filter((c) => String(c["orgId"]) === orgId);
}
