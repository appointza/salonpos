import type { EntityId } from "@/ids";
import { sameId } from "@/ids";
import type { Db, Row } from "@/store";
import { findCustomerByPhoneInOrg, normalizePhone } from "@/pages/Customers/customer-lookup";
import { parseAppointmentServiceIds } from "@/pages/Appointments/appointment-resolve";
import { referralCodeFor } from "@/pages/LoyaltyQr/qr-loyalty";
import { findCouponSchemeByCode } from "@/pages/Coupons/coupon-engine";
import { findVoucherByCode } from "@/pages/Coupons/voucher-local";
import { customerService } from "@/services/customer.service";
import { postLoyaltyTransaction, type LoyaltyStore } from "@/pages/Loyalty/loyalty-service";
import { readReferralRules, referralRewardLabel, type ReferralRules } from "@/pages/Loyalty/referral-settings";
import { WHEEL_SPINS } from "@/pages/PrizeWheel/wheel-service";

export type ReferralRecord = {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerPhone: string;
  referrerCode: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  referredAt: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function codeKey(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

export function findReferrerByCode(db: Db, orgId: EntityId, code: string) {
  const key = codeKey(code);
  if (key.length < 4) return null;
  return (
    (db["customers"] ?? []).find((c) => {
      if (!sameId(c["orgId"], orgId)) return false;
      return codeKey(c["referralCode"]) === key || codeKey(ensureCustomerReferralCode(c)) === key;
    }) ?? null
  );
}

export type WalkInCodeResult = {
  ok: boolean;
  kind?: "referral" | "coupon";
  label?: string;
  reason?: string;
  /** Referral reward will actually be granted (first service booking, new to shop, once). */
  applies?: boolean;
};

const SKIP_APPT_STATUS = new Set(["cancelled", "canceled", "no-show", "no show"]);

function appointmentHasService(row: Row) {
  if (parseAppointmentServiceIds(row).length > 0) return true;
  return Boolean(String(row["service"] ?? row["serviceName"] ?? "").trim());
}

export function guestHasPriorServiceAtShop(
  db: Db,
  input: {
    orgId: EntityId;
    locationId: EntityId;
    phone?: string;
    customer?: Row | null;
    excludeAppointmentId?: EntityId;
  },
) {
  const customer = input.customer ?? null;
  if (customer && Number(customer["totalVisits"] ?? customer["visits"] ?? 0) > 0) return true;

  const digits = normalizePhone(input.phone || String(customer?.["phone"] ?? ""));
  for (const a of db["appointments"] ?? []) {
    if (input.excludeAppointmentId && sameId(a.id, input.excludeAppointmentId)) continue;
    if (a["orgId"] && !sameId(a["orgId"], input.orgId)) continue;
    if (input.locationId && a["locationId"] && Number(a["locationId"]) > 0 && !sameId(a["locationId"], input.locationId)) {
      continue;
    }
    if (SKIP_APPT_STATUS.has(String(a["status"] ?? "").trim().toLowerCase())) continue;
    if (!appointmentHasService(a)) continue;
    if (customer && sameId(a["customerId"], customer.id)) return true;
    if (digits.length >= 10 && String(a["notes"] ?? "").replace(/\D/g, "").includes(digits)) return true;
  }

  for (const inv of db["invoices"] ?? []) {
    if (inv["orgId"] && !sameId(inv["orgId"], input.orgId)) continue;
    if (input.locationId && inv["locationId"] && Number(inv["locationId"]) > 0 && !sameId(inv["locationId"], input.locationId)) {
      continue;
    }
    const status = String(inv["status"] ?? "").toLowerCase();
    if (status === "refunded" || status === "void" || status === "cancelled") continue;
    if (customer && sameId(inv["customerId"], customer.id)) return true;
  }

  return false;
}

export function canClaimReferralAtShop(
  db: Db,
  input: {
    orgId: EntityId;
    locationId: EntityId;
    phone?: string;
    customer?: Row | null;
    hasService: boolean;
    excludeAppointmentId?: EntityId;
  },
): { ok: boolean; reason?: string } {
  if (!input.hasService) {
    return { ok: false, reason: "Referral applies only when a service is booked" };
  }
  const customer =
    input.customer ??
    findCustomerByPhoneInOrg(db["customers"] ?? [], input.phone ?? "", input.orgId, input.locationId);
  if (customer && String(customer["referredBy"] ?? "").trim()) {
    return { ok: false, reason: "This guest already used a referral at this salon" };
  }
  if (guestHasPriorServiceAtShop(db, { ...input, customer })) {
    return { ok: false, reason: "Referral is only for a first-time service booking at this salon" };
  }
  return { ok: true };
}

export function validateWalkInCodeLocal(
  db: Db,
  orgId: EntityId,
  code: string,
  guestPhone = "",
  shop?: { locationId?: EntityId; hasService?: boolean },
): WalkInCodeResult {
  const key = codeKey(code).replace(/^#/, "");
  if (!key) return { ok: true };
  if (key.length < 4) return { ok: false, reason: "Enter the full code" };

  const referrer = findReferrerByCode(db, orgId, key);
  if (referrer) {
    const guest = normalizePhone(guestPhone);
    if (guest.length >= 10 && normalizePhone(String(referrer["phone"] ?? "")) === guest) {
      return { ok: false, reason: "Use a friend's code, not your own" };
    }
    const who = String(referrer["name"] ?? "").trim();
    const claim = canClaimReferralAtShop(db, {
      orgId,
      locationId: shop?.locationId ?? "",
      phone: guestPhone,
      hasService: shop?.hasService !== false,
    });
    if (!claim.ok) {
      return {
        ok: true,
        kind: "referral",
        applies: false,
        label: `${who ? `${who}'s code` : "Referral code"} is valid, but ${claim.reason?.toLowerCase() ?? "it cannot be used"}`,
        reason: claim.reason,
      };
    }
    return {
      ok: true,
      kind: "referral",
      applies: true,
      label: who
        ? `Valid — ${who}'s referral. Applies on this first service booking only.`
        : `Valid referral code ${key}. Applies on this first service booking only.`,
    };
  }

  const voucher = findVoucherByCode(db, key, orgId);
  if (voucher) {
    const status = String(voucher["status"] ?? "");
    if (status === "Cancelled") return { ok: false, reason: "Coupon cancelled" };
    if (status === "Redeemed" && String(voucher["unlimited"] ?? "") !== "Yes") {
      return { ok: false, reason: "Coupon already used" };
    }
    const title = String(voucher["schemeTitle"] ?? key).trim() || key;
    return {
      ok: true,
      kind: "coupon",
      label: `Valid coupon — ${title}. Staff will apply it on the bill.`,
    };
  }

  const scheme = findCouponSchemeByCode(db, key, orgId);
  if (scheme) {
    const title = scheme.title || scheme.code || key;
    return {
      ok: true,
      kind: "coupon",
      label: `Valid offer — ${title}. Staff will apply it on the bill.`,
    };
  }

  const partner = (db["partnerCoupons"] ?? []).find(
    (p) => sameId(p["orgId"], orgId) && codeKey(p["couponCode"]).replace(/^#/, "") === key,
  );
  if (partner) {
    const status = String(partner["status"] ?? "");
    if (status === "Redeemed" || status === "Cancelled") {
      return { ok: false, reason: "Coupon already used or cancelled" };
    }
    const title = String(partner["offer"] ?? key).trim() || key;
    return {
      ok: true,
      kind: "coupon",
      label: `Valid coupon — ${title}. Staff will apply it on the bill.`,
    };
  }

  return { ok: false, reason: "Code not found for this salon" };
}

export async function validateWalkInCode(
  db: Db,
  orgId: EntityId,
  code: string,
  guestPhone = "",
  publicGuest = false,
  shop?: { locationId?: EntityId; hasService?: boolean },
): Promise<WalkInCodeResult> {
  const local = validateWalkInCodeLocal(db, orgId, code, guestPhone, shop);
  if (!codeKey(code) || local.ok) return local;

  try {
    const res = await customerService.validateWalkInCode(
      { orgId: Number(orgId) || 0, code: codeKey(code), guestPhone },
      publicGuest,
    );
    if (!res) return local;
    return {
      ok: !!res.ok,
      kind: res.kind === "coupon" || res.kind === "referral" ? res.kind : undefined,
      label: res.label || undefined,
      reason: res.reason || undefined,
      applies:
        res.kind === "referral"
          ? canClaimReferralAtShop(db, {
              orgId,
              locationId: shop?.locationId ?? "",
              phone: guestPhone,
              hasService: shop?.hasService !== false,
            }).ok
          : undefined,
    };
  } catch {
    return local;
  }
}

export function ensureCustomerReferralCode(customer: Row) {
  const existing = String(customer["referralCode"] ?? "").trim();
  if (existing) return existing;
  return referralCodeFor(String(customer["name"] ?? ""), String(customer["phone"] ?? ""));
}

export async function persistCustomerReferralCode(
  update: (collection: string, id: string | number, row: Row) => Promise<void> | void,
  customer: Row | null | undefined,
) {
  if (!customer?.id) return "";
  const code = ensureCustomerReferralCode(customer);
  if (!code) return "";
  if (String(customer["referralCode"] ?? "").trim() === code) return code;
  await update("customers", customer.id, { ...customer, referralCode: code });
  return code;
}

export function listReferralRecords(db: Db, orgId: EntityId): ReferralRecord[] {
  const customers = (db["customers"] ?? []).filter((c) => sameId(c["orgId"], orgId));
  const rows: ReferralRecord[] = [];
  for (const guest of customers) {
    const code = String(guest["referredBy"] ?? "").trim();
    if (!code) continue;
    const referrer = findReferrerByCode(db, orgId, code);
    rows.push({
      id: String(guest.id),
      referrerId: referrer ? String(referrer.id) : "",
      referrerName: referrer ? String(referrer["name"] ?? "—") : "Unknown code",
      referrerPhone: referrer ? String(referrer["phone"] ?? "") : "",
      referrerCode: code.toUpperCase(),
      guestId: String(guest.id),
      guestName: String(guest["name"] ?? "—"),
      guestPhone: String(guest["phone"] ?? ""),
      referredAt: String(guest["createdon"] ?? guest["createdAt"] ?? "").slice(0, 10),
    });
  }
  return rows.sort((a, b) => b.referredAt.localeCompare(a.referredAt));
}

export function listReferrers(db: Db, orgId: EntityId) {
  const records = listReferralRecords(db, orgId);
  const map = new Map<
    string,
    { id: string; name: string; phone: string; code: string; guests: number; lastAt: string }
  >();
  for (const row of records) {
    const key = row.referrerId || row.referrerCode;
    const current = map.get(key);
    if (current) {
      current.guests += 1;
      if (row.referredAt > current.lastAt) current.lastAt = row.referredAt;
    } else {
      map.set(key, {
        id: row.referrerId,
        name: row.referrerName,
        phone: row.referrerPhone,
        code: row.referrerCode,
        guests: 1,
        lastAt: row.referredAt,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.guests - a.guests);
}

function prizeTypeFor(rules: ReferralRules) {
  if (rules.rewardType === "percentage") return "Percentage discount";
  if (rules.rewardType === "flat") return "Flat discount";
  if (rules.rewardType === "free-service") return "Free service";
  return "Bonus points";
}

function referralReferenceId(newCustomerId: EntityId, winnerId: EntityId) {
  const guest = Number(newCustomerId) || 0;
  const self = String(winnerId) === String(newCustomerId) ? 1 : 0;
  return guest * 10 + self;
}

function alreadyRewarded(db: Db, winnerId: EntityId, referenceId: number) {
  const spins = (db[WHEEL_SPINS] ?? []).some(
    (s) =>
      String(s["source"] ?? "") === "referral" &&
      String(s["customerId"]) === String(winnerId) &&
      Number(s["referenceId"] ?? 0) === referenceId,
  );
  const txs = (db["loyaltyTransactions"] ?? []).some(
    (t) =>
      String(t["source"] ?? "") === "referral" &&
      String(t["customerId"]) === String(winnerId) &&
      Number(t["referenceId"] ?? 0) === referenceId,
  );
  return spins || txs;
}

function issueReferralPrize(
  store: LoyaltyStore,
  input: {
    rules: ReferralRules;
    winner: Row;
    newCustomer: Row;
    orgId: EntityId;
    locationId: EntityId;
    services: Row[];
  },
) {
  const { rules, winner, newCustomer, orgId, locationId, services } = input;
  const referenceId = referralReferenceId(newCustomer.id, winner.id);
  if (alreadyRewarded(store.db, winner.id, referenceId)) return;
  const label = `Referral · ${referralRewardLabel(rules, services)}`;
  if (rules.rewardType === "points") {
    postLoyaltyTransaction(store, {
      customerId: winner.id,
      type: "Earn",
      points: rules.rewardValue,
      source: "referral",
      referenceId: String(referenceId),
      locationId,
      orgId,
      reason: label,
    });
    return;
  }
  const prizeType = prizeTypeFor(rules);
  const prizeValue = rules.rewardType === "free-service" ? rules.serviceId : rules.rewardValue;
  store.create(
    WHEEL_SPINS,
    {
      id: 0,
      orgId: Number(orgId) || 0,
      locationId: Number(locationId) || 0,
      customerId: Number(winner.id) || 0,
      programId: 0,
      segmentId: 0,
      rewardType: prizeType,
      rewardValue: prizeValue,
      label,
      source: "referral",
      referenceId,
      checkinId: 0,
      status: prizeType === "Bonus points" || prizeType === "No prize" ? "Completed" : "Pending",
      createdAt: today(),
    },
    String(orgId),
  );
}

/** When a new guest books their first service at this salon with a referral code, reward the referrer once. */
export function applyReferralOnFirstService(
  store: LoyaltyStore,
  input: {
    newCustomer: Row;
    orgId: EntityId;
    locationId: EntityId;
    referredByCode?: string;
    hasService: boolean;
    services?: Row[];
    excludeAppointmentId?: EntityId;
  },
) {
  const code = String(input.referredByCode ?? "").trim().toUpperCase();
  if (!code) return { ok: false as const, reason: "No referral code" };
  const claim = canClaimReferralAtShop(store.db, {
    orgId: input.orgId,
    locationId: input.locationId,
    phone: String(input.newCustomer["phone"] ?? ""),
    customer: input.newCustomer,
    hasService: input.hasService,
    excludeAppointmentId: input.excludeAppointmentId,
  });
  if (!claim.ok) return { ok: false as const, reason: claim.reason ?? "Referral cannot be applied" };
  const orgRow = (store.db["organizations"] ?? []).find((o) => sameId(o["orgId"], input.orgId));
  const rules = readReferralRules(orgRow, input.orgId);
  if (!rules.enabled) return { ok: false as const, reason: "Referral rewards are off" };
  const referrer = findReferrerByCode(store.db, input.orgId, code);
  if (!referrer) return { ok: false as const, reason: "Referral code not found" };
  if (String(referrer.id) === String(input.newCustomer.id)) {
    return { ok: false as const, reason: "Cannot refer yourself" };
  }
  const services = input.services ?? store.db["services"] ?? [];
  const guest = { ...input.newCustomer, referredBy: code };
  store.update("customers", input.newCustomer.id, guest);
  issueReferralPrize(store, {
    rules,
    winner: referrer,
    newCustomer: guest,
    orgId: input.orgId,
    locationId: input.locationId,
    services,
  });
  if (rules.rewardNewGuest) {
    issueReferralPrize(store, {
      rules,
      winner: guest,
      newCustomer: guest,
      orgId: input.orgId,
      locationId: input.locationId,
      services,
    });
  }
  return { ok: true as const, referrer };
}

/** @deprecated Use applyReferralOnFirstService — referrals no longer apply on signup/walk-in. */
export function applyReferralOnSignup(
  store: LoyaltyStore,
  input: {
    newCustomer: Row;
    orgId: EntityId;
    locationId: EntityId;
    referredByCode?: string;
    services?: Row[];
  },
) {
  return applyReferralOnFirstService(store, { ...input, hasService: false });
}
