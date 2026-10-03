import { useCallback, useMemo } from "react";
import type { EntityId } from "@/ids";
import type { Db, Row } from "@/store";
import { useData } from "@/store";
import { useTenant } from "@/tenant";

export type ServiceDisplaySettings = {
  /** Extra % shown as list price above the catalog price (0 = off). */
  markupPct: number;
};

const STORAGE_KEY = "krios-service-display-settings";
const ORG_FIELD = "serviceDisplaySettings";

export function defaultServiceDisplaySettings(): ServiceDisplaySettings {
  return { markupPct: 10 };
}

function readAllStored(): Record<string, ServiceDisplaySettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ServiceDisplaySettings>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStored(orgId: EntityId, settings: ServiceDisplaySettings) {
  if (typeof window === "undefined") return;
  const all = readAllStored();
  all[String(orgId)] = settings;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function normalizeServiceDisplaySettings(next: ServiceDisplaySettings): ServiceDisplaySettings {
  const pct = Number(next.markupPct);
  return {
    markupPct: Number.isFinite(pct) ? Math.min(100, Math.max(0, Math.round(pct))) : 0,
  };
}

export function parseServiceDisplaySettings(raw: string | number | undefined): ServiceDisplaySettings | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceDisplaySettings>;
    return normalizeServiceDisplaySettings({
      markupPct: Number(parsed.markupPct ?? defaultServiceDisplaySettings().markupPct),
    });
  } catch {
    return null;
  }
}

export function readServiceDisplaySettings(orgRow: Row | undefined | null, orgId?: EntityId): ServiceDisplaySettings {
  const fromRow = parseServiceDisplaySettings(orgRow?.[ORG_FIELD]);
  const id = String(orgId ?? orgRow?.["orgId"] ?? "");
  const stored = id ? readAllStored()[id] : undefined;
  return stored ?? fromRow ?? defaultServiceDisplaySettings();
}

export function hydrateServiceDisplaySettings(db: Db): Db {
  const stored = readAllStored();
  if (!Object.keys(stored).length) return db;
  const organizations = (db.organizations ?? []).map((row) => {
    const saved = stored[String(row.orgId)];
    if (!saved) return row;
    return { ...row, [ORG_FIELD]: JSON.stringify(normalizeServiceDisplaySettings(saved)) };
  });
  return { ...db, organizations };
}

export function serviceDisplayPrices(price: number, settings: ServiceDisplaySettings) {
  const actual = Math.max(0, Number(price) || 0);
  const markupPct = normalizeServiceDisplaySettings(settings).markupPct;
  const list = markupPct > 0 ? Math.round(actual * (1 + markupPct / 100)) : actual;
  return { actual, list, markupPct };
}

export function useServiceDisplaySettings() {
  const { orgId } = useTenant();
  const { allRows, applyCache } = useData();
  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId)),
    [allRows, orgId],
  );
  const settings = useMemo(() => readServiceDisplaySettings(orgRow, orgId), [orgRow, orgId]);

  const save = useCallback(
    (next: ServiceDisplaySettings) => {
      const cleaned = normalizeServiceDisplaySettings(next);
      writeStored(orgId, cleaned);
      applyCache((prev) => ({
        ...prev,
        organizations: (prev["organizations"] ?? []).map((row) =>
          String(row["orgId"]) === String(orgId)
            ? { ...row, [ORG_FIELD]: JSON.stringify(cleaned) }
            : row,
        ),
      }));
    },
    [applyCache, orgId],
  );

  return { settings, save, orgRow };
}
