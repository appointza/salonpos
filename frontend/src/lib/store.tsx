import type { EntityId } from "@/lib/ids";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { hydrateBookingRules } from "@/lib/booking-rules";
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
import { API_COLLECTION_KEYS, ENTITY_SERVICE_MAP } from "@/lib/entity-service-map";
import { rowToEntity, toRow } from "@/lib/entity-row";
import type { KriosSelectReq } from "@/services/krios-base.service";
import { toast } from "sonner";

export type Row = { id: string | number } & Record<string, string | number>;
export type Db = Record<string, Row[]>;

/** Collections that belong to the org, not a single outlet. */
const ORG_WIDE = new Set([
  "organizations",
  "locations",
  "membershipPlans",
  "loyalty",
  "loyaltyTransactions",
  "inventory",
  "stockMovements",
  "serviceProducts",
  "roles",
]);

/** Local-only collections (no backend table yet). */
const LOCAL_ONLY = new Set(["whatsappMessages", "whatsappTemplates", "customerRewards", "auditLog"]);

function emptyDb(): Db {
  return {};
}

type Ctx = {
  db: Db;
  allRows: Db;
  orgId: EntityId | number;
  locationId: EntityId | number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Merge API/cache rows without calling Save again (e.g. after CompleteSale). */
  applyCache: (updater: (prev: Db) => Db) => void;
  create: (collection: string, row: Row, orgOverride?: string | number) => Promise<Row | void>;
  update: (collection: string, id: string | number, row: Row) => Promise<void>;
  remove: (collection: string, id: string | number) => Promise<void>;
  replaceGoogleReviews: (locationId: EntityId | number, reviews: Row[], meta: Record<string, string | number>) => void;
  reset: () => void;
};

const DataContext = createContext<Ctx | null>(null);

async function loadCollectionFromApi(collection: string, orgId: number): Promise<Row[]> {
  const service = ENTITY_SERVICE_MAP[collection];
  if (!service) return [];
  const req: KriosSelectReq = { orgId };
  const items = await service.select(req);
  return items.map((item) => toRow(item as Record<string, unknown>));
}

async function loadAllFromApi(orgId: number): Promise<Db> {
  const db: Db = {};
  await Promise.all(
    API_COLLECTION_KEYS.map(async (key) => {
      try {
        db[key] = await loadCollectionFromApi(key, orgId);
      } catch {
        db[key] = [];
      }
    }),
  );
  return hydrateBookingRules(hydratePublicBookingSettings(db));
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { orgId, locationId, org } = useTenant();
  const { user } = useAuth();
  const [db, setDb] = useState<Db>(emptyDb);
  const dbRef = useRef(db);
  dbRef.current = db;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const oid = Number(orgId);
    if (!oid) {
      setDb(emptyDb());
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const remote = await loadAllFromApi(oid);
      setDb((prev) => {
        const next: Db = { ...remote };
        for (const key of LOCAL_ONLY) {
          if (prev[key]?.length) next[key] = prev[key];
        }
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load data from API";
      setError(msg);
      setDb(emptyDb());
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const persist = useCallback((updater: (prev: Db) => Db) => {
    const next = updater(dbRef.current);
    dbRef.current = next;
    setDb(next);
  }, []);

  const scoped = useMemo<Db>(() => {
    const out: Db = {};
    for (const [key, rows] of Object.entries(db)) {
      out[key] = rows.filter((r) => {
        if (String(r["orgId"]) !== String(orgId)) return false;
        if (ORG_WIDE.has(key) || locationId === "all") return true;
        return String(r["locationId"]) === String(locationId);
      });
    }
    if (user?.role !== "STYLIST") return out;
    const me = resolveStaffForUser((db["staff"] ?? []).filter((s) => String(s["orgId"]) === String(orgId)), user);
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
    const defaultLocation = locationId === "all" ? (org.locations[0]?.locationId ?? 0) : locationId;
    const actor = String(user?.email || user?.id || "system");
    const today = new Date().toISOString().slice(0, 10);
    const resolveLocationId = (row: Row) => {
      const raw = row["locationId"];
      if (raw !== undefined && raw !== null && raw !== "") return Number(raw) || 0;
      return Number(defaultLocation) || 0;
    };
    const stamp = (row: Row, orgOverride?: string | number): Row => ({
      createdby: actor,
      createdon: today,
      ...row,
      orgId: Number(orgOverride ?? orgId) || 0,
      locationId: resolveLocationId(row),
      updatedby: actor,
      updatedon: today,
    });
    const me =
      user?.role === "STYLIST" ? resolveStaffForUser((db["staff"] ?? []).filter((s) => String(s["orgId"]) === String(orgId)), user) : null;
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
      loading,
      error,
      reload,
      applyCache: persist,
      create: async (collection, row, orgOverride) => {
        const allowed = guard(collection, stamp(row, orgOverride));
        if (!allowed) return;
        const service = ENTITY_SERVICE_MAP[collection];
        if (service) {
          try {
            const saved = await service.save(rowToEntity(allowed));
            const next = toRow(saved as Record<string, unknown>);
            persist((prev) => ({ ...prev, [collection]: [next, ...(prev[collection] ?? [])] }));
            return next;
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Create failed");
            throw e;
          }
        }
        persist((prev) => ({ ...prev, [collection]: [allowed, ...(prev[collection] ?? [])] }));
        return allowed;
      },
      update: async (collection, id, row) => {
        const snapshot = dbRef.current;
        const current = (snapshot[collection] ?? []).find((r) => String(r.id) === String(id));
        if (!current) return;
        const allowed = guard(collection, stamp({ ...current, ...row }));
        if (!allowed) return;
        const service = ENTITY_SERVICE_MAP[collection];
        if (service) {
          try {
            const saved = await service.save(rowToEntity({ ...allowed, id }));
            const next = toRow(saved as Record<string, unknown>);
            persist((prev) => ({
              ...prev,
              [collection]: (prev[collection] ?? []).map((r) => (String(r.id) === String(id) ? next : r)),
            }));
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Update failed");
            throw e;
          }
          return;
        }
        persist((prev) => ({
          ...prev,
          [collection]: (prev[collection] ?? []).map((r) =>
            String(r.id) === String(id) && String(r["orgId"]) === String(orgId) ? allowed : r,
          ),
        }));
      },
      remove: async (collection, id) => {
        const current = (db[collection] ?? []).find((r) => String(r.id) === String(id) && String(r["orgId"]) === String(orgId));
        if (me && current && !stylistMayMutate(collection, stampStylistRow(collection, current, me), me)) return;
        const service = ENTITY_SERVICE_MAP[collection];
        if (service) {
          try {
            await service.delete({ id: Number(id), orgId: Number(orgId) });
            persist((prev) => ({
              ...prev,
              [collection]: (prev[collection] ?? []).filter(
                (r) => !(String(r.id) === String(id) && String(r["orgId"]) === String(orgId)),
              ),
            }));
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
            throw e;
          }
          return;
        }
        persist((prev) => ({
          ...prev,
          [collection]: (prev[collection] ?? []).filter(
            (r) => !(String(r.id) === String(id) && String(r["orgId"]) === String(orgId)),
          ),
        }));
      },
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
                (r) => !(String(r["orgId"]) === String(orgId) && String(r["locationId"]) === String(targetLocationId)),
              ),
              ...stamped,
            ],
            locations: (prev["locations"] ?? []).map((loc) =>
              String(loc["orgId"]) === String(orgId) && String(loc["locationId"] ?? loc.id) === String(targetLocationId)
                ? stamp({ ...loc, ...meta, locationId: targetLocationId })
                : loc,
            ),
          };
        }),
      reset: () => void reload(),
    };
  }, [scoped, persist, orgId, locationId, org, user, db, loading, error, reload]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

export function useCollection(collection: string) {
  const { db, create, update, remove, loading, error } = useData();
  return {
    rows: db[collection] ?? [],
    loading,
    error,
    create: (row: Row) => create(collection, row),
    update: (id: string | number, row: Row) => update(collection, id, row),
    remove: (id: string | number) => remove(collection, id),
  };
}
