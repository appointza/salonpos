import type { SessionUser } from "@/lib/auth";
import type { Row } from "@/lib/store";

const STAFF_ID_COLLECTIONS = new Set(["shifts", "attendance", "leaves", "payroll", "commissions"]);
const STAFF_NAME_COLLECTIONS = new Set(["appointments", "feedback"]);
const CUSTOMER_ID_COLLECTIONS = new Set(["memberships", "loyaltyTransactions", "membershipUsage"]);
const STYLIST_WRITABLE = new Set(["appointments", "customers", "attendance", "leaves", "qrCheckins"]);

export function resolveStaffForUser(
  staff: Row[],
  user: Pick<SessionUser, "id" | "email" | "name" | "staffId"> | null,
): Row | null {
  if (!user) return null;
  if (user.staffId) {
    const byId = staff.find((s) => String(s.id) === String(user.staffId));
    if (byId) return byId;
  }
  const email = user.email.trim().toLowerCase();
  const name = user.name.trim().toLowerCase();
  return (
    staff.find((s) => String(s["email"] ?? "").trim().toLowerCase() === email) ??
    staff.find((s) => String(s["name"] ?? "").trim().toLowerCase() === name) ??
    staff.find((s) => String(s.id) === user.id) ??
    null
  );
}

export function isAssignedToStaff(row: Row, me: Row) {
  const myId = String(me.id);
  const myName = String(me["name"] ?? "").trim().toLowerCase();
  const staffId = String(row["staffId"] ?? "");
  const staffName = String(row["staff"] ?? "").trim().toLowerCase();
  return staffId === myId || (Boolean(staffName) && staffName === myName);
}

export function relatedCustomersForStylist(appointments: Row[], customers: Row[], me: Row) {
  const mine = appointments.filter((row) => isAssignedToStaff(row, me));
  const names = new Set(mine.map((row) => String(row["customer"] ?? "").trim()).filter(Boolean));
  const ids = new Set(
    customers.filter((row) => names.has(String(row["name"] ?? "").trim())).map((row) => String(row.id)),
  );
  return { names, ids };
}

export function rowVisibleToStylist(
  collection: string,
  row: Row,
  me: Row,
  related: { names: Set<string>; ids: Set<string> },
) {
  if (collection === "staff") return String(row.id) === String(me.id);
  if (STAFF_ID_COLLECTIONS.has(collection)) return String(row["staffId"] ?? "") === String(me.id);
  if (STAFF_NAME_COLLECTIONS.has(collection)) return isAssignedToStaff(row, me);
  if (collection === "customers") {
    return related.names.has(String(row["name"] ?? "").trim()) || related.ids.has(String(row.id));
  }
  if (collection === "invoices") {
    return (
      related.names.has(String(row["customer"] ?? "").trim()) || related.ids.has(String(row["customerId"] ?? ""))
    );
  }
  if (CUSTOMER_ID_COLLECTIONS.has(collection)) return related.ids.has(String(row["customerId"] ?? ""));
  return true;
}

export function stampStylistRow(collection: string, row: Row, me: Row): Row {
  const home = {
    locationId: String(me["locationId"] ?? row["locationId"] ?? ""),
    outlet: String(me["outlet"] ?? row["outlet"] ?? ""),
  };
  if (collection === "appointments") {
    return { ...row, ...home, staff: String(me["name"] ?? ""), staffId: String(me.id) };
  }
  if (collection === "attendance" || collection === "leaves" || collection === "shifts") {
    return { ...row, staffId: String(me.id), locationId: home.locationId || String(row["locationId"] ?? "") };
  }
  return row;
}

export function stylistMayMutate(collection: string, row: Row, me: Row) {
  if (!STYLIST_WRITABLE.has(collection)) return false;
  if (collection === "customers" || collection === "qrCheckins") return true;
  return isAssignedToStaff(row, me);
}
