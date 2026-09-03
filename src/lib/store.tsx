import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import seed from "@/data/salonData.json";
import { useTenant } from "@/lib/tenant";

export type Row = { id: string | number } & Record<string, string | number>;
export type Db = Record<string, Row[]>;

const STORAGE_KEY = "salon-crm-db-v1";

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
  reset: () => void;
};

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { orgId, locationId, org } = useTenant();
  const [db, setDb] = useState<Db>(() => structuredClone(seed) as Db);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setDb(JSON.parse(saved) as Db);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Db) => {
    setDb(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const scoped = useMemo<Db>(() => {
    const out: Db = {};
    for (const [key, rows] of Object.entries(db)) {
      out[key] = rows.filter(
        (r) => String(r["orgId"]) === orgId && (locationId === "all" || String(r["locationId"]) === locationId),
      );
    }
    return out;
  }, [db, orgId, locationId]);

  const value = useMemo<Ctx>(() => {
    const defaultLocation = locationId === "all" ? (org.locations[0]?.locationId ?? "") : locationId;
    const stamp = (row: Row, orgOverride?: string): Row => ({
      ...row,
      orgId: orgOverride ?? orgId,
      locationId: String(row["locationId"] ?? "") || defaultLocation,
    });
    return {
      db: scoped,
      allRows: db,
      orgId,
      locationId,
      create: (collection, row, orgOverride) =>
        persist({ ...db, [collection]: [stamp(row, orgOverride), ...(db[collection] ?? [])] }),
      update: (collection, id, row) =>
        persist({
          ...db,
          [collection]: (db[collection] ?? []).map((r) =>
            String(r.id) === id && String(r["orgId"]) === orgId ? stamp({ ...r, ...row }) : r,
          ),
        }),
      remove: (collection, id) =>
        persist({
          ...db,
          [collection]: (db[collection] ?? []).filter(
            (r) => !(String(r.id) === id && String(r["orgId"]) === orgId),
          ),
        }),
      reset: () => persist(structuredClone(seed) as Db),
    };
  }, [db, scoped, persist, orgId, locationId, org]);

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
