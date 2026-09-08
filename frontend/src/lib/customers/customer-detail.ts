import type { Db, Row } from "@/lib/store";
import { getCustomerById } from "@/lib/customers/customer-lookup";
import { getCustomerLoyaltyBalance } from "@/lib/loyalty/loyalty-service";
import { includedUsed, isMembershipLive, planForEnrollment } from "@/lib/membership";
import { resolveAppointmentCustomerId } from "@/lib/appointments/appointment-resolve";

export type CustomerMembershipDetail = {
  enrollment: Row;
  plan: Row | null;
  isLive: boolean;
  includedUsed: number;
  includedLimit: number;
  remaining: number | null;
  usages: Row[];
};

export type CustomerPointsSummary = {
  balance: number;
  earned: number;
  redeemed: number;
};

export type CustomerDetail = {
  customer: Row;
  points: CustomerPointsSummary;
  memberships: CustomerMembershipDetail[];
  loyaltyTransactions: Row[];
  invoices: Row[];
  appointments: Row[];
  checkins: Row[];
  wheelSpins: Row[];
  offerRedemptions: Row[];
  partnerCoupons: Row[];
  products: Row[];
  feedback: Row[];
};

function matchesCustomer(row: Row, customer: Row) {
  const cid = String(customer.id);
  if (String(row["customerId"] ?? "") === cid) return true;
  const name = String(customer["name"] ?? "").trim().toLowerCase();
  if (!name) return false;
  return String(row["customer"] ?? "").trim().toLowerCase() === name;
}

function sortDesc(rows: Row[], key: string) {
  return [...rows].sort((a, b) => String(b[key] ?? "").localeCompare(String(a[key] ?? "")));
}

export function buildCustomerDetail(db: Db, customerId: string): CustomerDetail | null {
  const customer = getCustomerById(db, customerId);
  if (!customer) return null;

  const orgId = String(customer["orgId"] ?? "");
  const memberships = (db["memberships"] ?? []).filter(
    (m) => String(m["customerId"] ?? "") === customerId || String(m.id) === String(customer["membershipId"] ?? ""),
  );
  const plans = (db["membershipPlans"] ?? []).filter((p) => !orgId || String(p["orgId"]) === orgId);
  const usage = (db["membershipUsage"] ?? []).filter((u) => String(u["customerId"]) === customerId);
  const customers = db["customers"] ?? [];

  const membershipDetails: CustomerMembershipDetail[] = memberships.map((enrollment) => {
    const plan = planForEnrollment(enrollment, plans);
    const limit = Number(plan?.["includedLimit"] ?? enrollment["includedLimit"] ?? 0);
    const used = includedUsed(usage, String(enrollment.id));
    const remaining = limit > 0 ? Math.max(0, limit - used) : null;
    return {
      enrollment,
      plan,
      isLive: isMembershipLive(enrollment),
      includedUsed: used,
      includedLimit: limit,
      remaining,
      usages: usage.filter((u) => String(u["membershipId"]) === String(enrollment.id)),
    };
  });

  const loyaltyTransactions = sortDesc(
    (db["loyaltyTransactions"] ?? []).filter((t) => String(t["customerId"]) === customerId),
    "createdon",
  );

  let earned = 0;
  let redeemed = 0;
  for (const t of loyaltyTransactions) {
    const pts = Number(t["points"] ?? 0);
    if (String(t["type"]) === "Redeem") redeemed += pts;
    else earned += pts;
  }

  const appointments = sortDesc(
    (db["appointments"] ?? [])
      .filter((a) => {
        const resolved = resolveAppointmentCustomerId(a, customers);
        return resolved === customerId || matchesCustomer(a, customer);
      }),
    "date",
  );

  return {
    customer,
    points: {
      balance: getCustomerLoyaltyBalance(db, customerId),
      earned,
      redeemed,
    },
    memberships: membershipDetails.sort((a, b) => Number(b.isLive) - Number(a.isLive)),
    loyaltyTransactions,
    invoices: sortDesc((db["invoices"] ?? []).filter((i) => matchesCustomer(i, customer)), "date"),
    appointments,
    checkins: sortDesc((db["qrCheckins"] ?? []).filter((c) => matchesCustomer(c, customer)), "visitAt"),
    wheelSpins: sortDesc((db["wheelSpins"] ?? []).filter((w) => String(w["customerId"]) === customerId), "createdAt"),
    offerRedemptions: sortDesc(
      (db["qrOfferRedemptions"] ?? []).filter((r) => String(r["customerId"]) === customerId),
      "issuedAt",
    ),
    partnerCoupons: sortDesc(
      (db["partnerCoupons"] ?? []).filter((c) => String(c["customerId"]) === customerId),
      "issuedAt",
    ),
    products: sortDesc(
      (db["stockMovements"] ?? []).filter((m) => {
        const type = String(m["type"]);
        return String(m["customerId"]) === customerId && (type === "Sale" || type === "Used");
      }),
      "date",
    ),
    feedback: sortDesc((db["feedback"] ?? []).filter((f) => matchesCustomer(f, customer)), "date"),
  };
}

export function membershipAvailabilityLabel(detail: CustomerMembershipDetail) {
  if (detail.includedLimit === 0) {
    return detail.isLive ? "Unlimited included services" : "Unlimited plan (inactive)";
  }
  if (detail.remaining === null) return "—";
  return `${detail.remaining} of ${detail.includedLimit} visits remaining`;
}
