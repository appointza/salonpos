import { useCallback, useMemo } from "react";
import type { EntityId } from "@/lib/ids";
import { defaultHours, defaultSlots, type DayHours, type SlotConfig } from "@/lib/auth";
import type { Db, Row } from "@/lib/store";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export type BookingRules = SlotConfig & { hours: DayHours[] };

const STORAGE_KEY = "krios-booking-rules";

export function defaultBookingRules(): BookingRules {
  return { ...defaultSlots(), hours: defaultHours() };
}

function readAllStored(): Record<string, BookingRules> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BookingRules>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStored(orgId: EntityId, rules: BookingRules) {
  if (typeof window === "undefined") return;
  const all = readAllStored();
  all[String(orgId)] = rules;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function parseBookingRules(raw: string | number | undefined): BookingRules | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BookingRules>;
    const base = defaultBookingRules();
    return {
      ...base,
      ...parsed,
      hours: Array.isArray(parsed.hours) && parsed.hours.length ? parsed.hours : base.hours,
      onlineBooking: parsed.onlineBooking !== false,
    };
  } catch {
    return null;
  }
}

export function readBookingRules(orgRow: Row | undefined | null, orgId?: EntityId): BookingRules {
  const fromRow = parseBookingRules(orgRow?.["bookingRules"]);
  const id = String(orgId ?? orgRow?.["orgId"] ?? "");
  const stored = id ? readAllStored()[id] : undefined;
  return stored ?? fromRow ?? defaultBookingRules();
}

export function hydrateBookingRules(db: Db): Db {
  const stored = readAllStored();
  if (!Object.keys(stored).length) return db;
  const organizations = (db.organizations ?? []).map((row) => {
    const saved = stored[String(row.orgId)];
    if (!saved) return row;
    return { ...row, bookingRules: JSON.stringify(saved) };
  });
  return { ...db, organizations };
}

export function useBookingRules() {
  const { orgId } = useTenant();
  const { allRows, applyCache } = useData();
  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId)),
    [allRows, orgId],
  );
  const rules = useMemo(() => readBookingRules(orgRow, orgId), [orgRow, orgId]);

  const save = useCallback(
    (next: BookingRules) => {
      const cleaned: BookingRules = {
        ...next,
        duration: String(Math.max(5, Number(next.duration) || 30)),
        buffer: String(Math.max(0, Number(next.buffer) || 0)),
        maxPerSlot: String(Math.max(1, Number(next.maxPerSlot) || 1)),
        advanceDays: String(Math.max(1, Number(next.advanceDays) || 30)),
        minNotice: String(Math.max(0, Number(next.minNotice) || 0)),
        onlineBooking: next.onlineBooking !== false,
        hours: next.hours,
      };
      writeStored(orgId, cleaned);
      applyCache((prev) => ({
        ...prev,
        organizations: (prev["organizations"] ?? []).map((row) =>
          String(row["orgId"]) === String(orgId) ? { ...row, bookingRules: JSON.stringify(cleaned) } : row,
        ),
      }));
    },
    [applyCache, orgId],
  );

  return { rules, save };
}
