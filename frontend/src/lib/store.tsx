import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import seed from "@/data/salonData.json";
import { hydratePublicBookingSettings } from "@/lib/public-booking-settings";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import {
  relatedCustomersForStylist,
  resolveStaffForUser,
  rowVisibleToStylist,
  stampStylistRow,
  stylistMayMutate,
} from "@/lib/staff-scope";

export type Row = { id: string | number } & Record<string, string | number>;
export type Db = Record<string, Row[]>;

/** Collections that belong to the org, not a single outlet. */
const ORG_WIDE = new Set([
  "organizations",
  "locations",
  "membershipPlans",
  "loyalty",
  "inventory",
  "stockMovements",
  "serviceProducts",
  "roles",
]);

type Ctx = {
  /** Rows scoped to the selected organisation + location. */
  db: Db;
  /** Every row across all organisations (platform console only). */
  allRows: Db;
  orgId: string;
  locationId: string;
  create: (collection: string, row: Row, orgOverride?: string) => void;
  update: (collection: string, id: string, row: Row) => void;
  remove: (collection: string, id: string) => void;
  replaceGoogleReviews: (locationId: string, reviews: Row[], meta: Record<string, string | number>) => void;
  reset: () => void;
};

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { orgId, locationId, org } = useTenant();
  const { user } = useAuth();
  const [db, setDb] = useState<Db>(() => hydratePublicBookingSettings(structuredClone(seed) as Db));

  const persist = useCallback((updater: (prev: Db) => Db) => {
    setDb(updater);
  }, []);

  const scoped = useMemo<Db>(() => {
    const out: Db = {};
    for (const [key, rows] of Object.entries(db)) {
      out[key] = rows.filter((r) => {
        if (String(r["orgId"]) !== orgId) return false;
        if (ORG_WIDE.has(key) || locationId === "all") return true;
        return String(r["locationId"]) === locationId;
      });
    }
    if (user?.role !== "STYLIST") return out;
    const me = resolveStaffForUser((db["staff"] ?? []).filter((s) => String(s["orgId"]) === orgId), user);
    if (!me) {
      const emptyPersonal = new Set([
        "appointments",
        "staff",
        "shifts",
        "attendance",
        "leaves",
        "payroll",
        "commissions",
        "customers",
        "invoices",
        "feedback",
        "memberships",
        "loyaltyTransactions",
        "membershipUsage",
      ]);
      const locked: Db = {};
      for (const [key, rows] of Object.entries(out)) {
        locked[key] = emptyPersonal.has(key) ? [] : rows;
      }
      return locked;
    }
    const related = relatedCustomersForStylist(out["appointments"] ?? [], out["customers"] ?? [], me);
    const filtered: Db = {};
    for (const [key, rows] of Object.entries(out)) {
      filtered[key] = rows.filter((r) => rowVisibleToStylist(key, r, me, related));
    }
    return filtered;
  }, [db, orgId, locationId, user]);

  const value = useMemo<Ctx>(() => {
    const defaultLocation = locationId === "all" ? (org.locations[0]?.locationId ?? "") : locationId;
    const actor = user?.id || "U-01";
    const today = new Date().toISOString().slice(0, 10);
    const stamp = (row: Row, orgOverride?: string): Row => ({
      createdby: actor,
      createdon: today,
      ...row,
      orgId: orgOverride ?? orgId,
      locationId: String(row["locationId"] ?? "") || defaultLocation,
      updatedby: actor,
      updatedon: today,
    });
    const me =
      user?.role === "STYLIST" ? resolveStaffForUser((db["staff"] ?? []).filter((s) => String(s["orgId"]) === orgId), user) : null;
    const guard = (collection: string, row: Row) => {
      if (!me) return row;
      const next = stampStylistRow(collection, row, me);
      return stylistMayMutate(collection, next, me) ? next : null;
    };
    return {
      db: scoped,
      allRows: db,
      orgId,
      locationId,
      create: (collection, row, orgOverride) =>
        persist((prev) => {
          const allowed = guard(collection, stamp(row, orgOverride));
          if (!allowed) return prev;
          return { ...prev, [collection]: [allowed, ...(prev[collection] ?? [])] };
        }),
      update: (collection, id, row) =>
        persist((prev) => {
          const current = (prev[collection] ?? []).find((r) => String(r.id) === id && String(r["orgId"]) === orgId);
          if (!current) return prev;
          const allowed = guard(collection, stamp({ ...current, ...row }));
          if (!allowed) return prev;
          return {
            ...prev,
            [collection]: (prev[collection] ?? []).map((r) => (String(r.id) === id && String(r["orgId"]) === orgId ? allowed : r)),
          };
        }),
      remove: (collection, id) =>
        persist((prev) => {
          const current = (prev[collection] ?? []).find((r) => String(r.id) === id && String(r["orgId"]) === orgId);
          if (me && current && !stylistMayMutate(collection, stampStylistRow(collection, current, me), me)) return prev;
          return {
            ...prev,
            [collection]: (prev[collection] ?? []).filter((r) => !(String(r.id) === id && String(r["orgId"]) === orgId)),
          };
        }),
      replaceGoogleReviews: (targetLocationId, reviews, meta) =>
        persist((prev) => {
          const stamped = reviews.map((row) =>
            stamp({
              ...row,
              locationId: targetLocationId,
              source: String(row["source"] ?? "Google"),
            }),
          );
          return {
            ...prev,
            googleReviews: [
              ...(prev["googleReviews"] ?? []).filter(
                (r) => !(String(r["orgId"]) === orgId && String(r["locationId"]) === targetLocationId),
              ),
              ...stamped,
            ],
            locations: (prev["locations"] ?? []).map((loc) =>
              String(loc["orgId"]) === orgId && String(loc["locationId"] ?? loc.id) === targetLocationId
                ? stamp({ ...loc, ...meta, locationId: targetLocationId })
                : loc,
            ),
          };
        }),
      reset: () => persist(() => hydratePublicBookingSettings(structuredClone(seed) as Db)),
    };
  }, [scoped, persist, orgId, locationId, org, user, db]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

export function useCollection(collection: string) {
  const { db, create, update, remove } = useData();
  return {
    rows: db[collection] ?? [],
    create: (row: Row) => create(collection, row),
    update: (id: string, row: Row) => update(collection, id, row),
    remove: (id: string) => remove(collection, id),
  };
}
