import type { EntityId } from "@/lib/ids";
import type { Db } from "@/lib/store";
import { normalizePhone } from "@/lib/customers/customer-lookup";
import { buildCustomerWallet } from "@/lib/rewards/customer-wallet";
import { activePrograms } from "@/lib/qr-loyalty";

export type ShopCoupon = {
  id: string;
  title: string;
  valueLabel: string;
  status: string;
  expiresAt: string;
};

export type CustomerShopVisit = {
  key: string;
  orgId: EntityId;
  orgName: string;
  locationId: EntityId;
  locationName: string;
  city: string;
  address: string;
  customerId: EntityId | null;
  points: number;
  tier: string;
  stampsCurrent: number;
  stampsRequired: number;
  visits: number;
  lastVisit: string;
  couponCount: number;
  coupons: ShopCoupon[];
};

type ShopAccumulator = {
  orgId: EntityId;
  locationId: EntityId;
  customerId: EntityId | null;
  visits: number;
  lastVisit: string;
};

function shopKey(orgId: EntityId, locationId: EntityId) {
  return `${orgId}::${locationId}`;
}

function orgName(db: Db, orgId: EntityId) {
  return String((db["organizations"] ?? []).find((o) => String(o["orgId"]) === orgId)?.["name"] ?? orgId);
}

function locationMeta(db: Db, locationId: EntityId) {
  const loc = (db["locations"] ?? []).find((l) => String(l["locationId"] ?? l.id) === locationId);
  return {
    name: String(loc?.["name"] ?? locationId),
    city: String(loc?.["city"] ?? ""),
    address: String(loc?.["address"] ?? ""),
  };
}

function phoneMatches(rowPhone: string, digits: string) {
  return normalizePhone(rowPhone) === digits;
}

function customerMatchesPhone(db: Db, customerId: EntityId, digits: string) {
  if (!customerId) return false;
  const customer = (db["customers"] ?? []).find((c) => String(c.id) === customerId);
  return customer ? phoneMatches(String(customer["phone"] ?? ""), digits) : false;
}

function upsertShop(map: Map<string, ShopAccumulator>, next: ShopAccumulator) {
  const key = shopKey(next.orgId, next.locationId);
  const existing = map.get(key);
  if (!existing) {
    map.set(key, next);
    return;
  }
  existing.visits += next.visits;
  if (next.lastVisit > existing.lastVisit) existing.lastVisit = next.lastVisit;
  if (!existing.customerId && next.customerId) existing.customerId = next.customerId;
}

/** All salons/studios this customer has visited, with points and coupons per store. */
export function getCustomerShopVisits(db: Db, phone: string): CustomerShopVisit[] {
  const digits = normalizePhone(phone);
  if (digits.length < 10) return [];

  const map = new Map<string, ShopAccumulator>();

  for (const c of db["customers"] ?? []) {
    if (!phoneMatches(String(c["phone"] ?? ""), digits)) continue;
    const orgId = String(c["orgId"]);
    const locationId = String(c["locationId"] ?? "");
    if (!orgId || !locationId) continue;
    upsertShop(map, {
      orgId,
      locationId,
      customerId: String(c.id),
      visits: Math.max(1, Number(c["totalVisits"] ?? c["visits"] ?? 0)),
      lastVisit: String(c["lastVisit"] ?? ""),
    });
  }

  for (const ck of db["qrCheckins"] ?? []) {
    const customerId = String(ck["customerId"] ?? "");
    const matches =
      phoneMatches(String(ck["phone"] ?? ""), digits) || customerMatchesPhone(db, customerId, digits);
    if (!matches) continue;
    const orgId = String(ck["orgId"]);
    const locationId = String(ck["locationId"]);
    if (!orgId || !locationId) continue;
    upsertShop(map, {
      orgId,
      locationId,
      customerId: customerId || null,
      visits: String(ck["status"]) === "Approved" ? 1 : 0,
      lastVisit: String(ck["visitAt"] ?? "").slice(0, 10),
    });
  }

  for (const a of db["appointments"] ?? []) {
    const customerId = String(a["customerId"] ?? "");
    const notesDigits = String(a["notes"] ?? "").replace(/\D/g, "");
    const matches =
      notesDigits.includes(digits) || customerMatchesPhone(db, customerId, digits);
    if (!matches) continue;
    const orgId = String(a["orgId"]);
    const locationId = String(a["locationId"] ?? "");
    if (!orgId || !locationId) continue;
    upsertShop(map, {
      orgId,
      locationId,
      customerId: customerId || null,
      visits: 1,
      lastVisit: String(a["date"] ?? ""),
    });
  }

  const results: CustomerShopVisit[] = [];
  for (const entry of map.values()) {
    const loc = locationMeta(db, entry.locationId);
    let points = 0;
    let tier = "Silver";
    let stampsCurrent = 0;
    let stampsRequired = 8;
    let coupons: ShopCoupon[] = [];

    if (entry.customerId) {
      const programs = activePrograms(
        (db["loyalty"] ?? []).filter((p) => String(p["orgId"]) === entry.orgId),
        entry.locationId,
      );
      const wallet = buildCustomerWallet(db, entry.customerId, programs, entry.locationId);
      if (wallet) {
        points = wallet.points;
        tier = wallet.tier;
        stampsCurrent = wallet.stampsCurrent;
        stampsRequired = wallet.stampsRequired;
        coupons = wallet.availableRewards.map((r) => ({
          id: r.id,
          title: r.title,
          valueLabel: r.valueLabel,
          status: r.status,
          expiresAt: r.expiresAt,
        }));
      } else {
        const customer = (db["customers"] ?? []).find((c) => String(c.id) === entry.customerId);
        points = Number(customer?.["points"] ?? 0);
        tier = String(customer?.["tier"] ?? "Silver");
        stampsCurrent = Number(customer?.["stampsCurrent"] ?? 0);
      }
    }

    results.push({
      key: shopKey(entry.orgId, entry.locationId),
      orgId: entry.orgId,
      orgName: orgName(db, entry.orgId),
      locationId: entry.locationId,
      locationName: loc.name,
      city: loc.city,
      address: loc.address,
      customerId: entry.customerId,
      points,
      tier,
      stampsCurrent,
      stampsRequired,
      visits: entry.visits,
      lastVisit: entry.lastVisit,
      couponCount: coupons.length,
      coupons,
    });
  }

  return results.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
}
