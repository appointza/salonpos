import { useCallback, useMemo } from "react";
import type { EntityId } from "@/ids";
import { defaultHours, defaultSlots, DEFAULT_DAYS, type DayHours, type SlotConfig } from "@/auth";
import type { Db, Row } from "@/store";
import { useData } from "@/store";
import { useTenant } from "@/tenant";

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

function weekdayKey(day: string) {
  return String(day).trim().toLowerCase().slice(0, 3);
}

function normalizeHours(hours: DayHours[] | undefined): DayHours[] {
  const list = Array.isArray(hours) && hours.length ? hours : defaultHours();
  return DEFAULT_DAYS.map((day) => {
    const hit = list.find((h) => weekdayKey(h.day) === weekdayKey(day));
    if (!hit) return { day, open: day !== "Sunday", from: "09:00", to: "20:00" };
    return {
      day,
      open: hit.open !== false,
      from: hit.from || "09:00",
      to: hit.to || "20:00",
    };
  });
}

export function normalizeBookingRules(next: BookingRules): BookingRules {
  const advance = Number(next.advanceDays);
  return {
    ...next,
    duration: String(Math.max(5, Number(next.duration) || 30)),
    buffer: String(Math.max(0, Number(next.buffer) || 0)),
    maxPerSlot: String(Math.max(1, Number(next.maxPerSlot) || 1)),
    advanceDays: String(Number.isFinite(advance) && advance >= 0 ? Math.floor(advance) : 30),
    minNotice: String(Math.max(0, Number(next.minNotice) || 0)),
    onlineBooking: next.onlineBooking !== false,
    hours: normalizeHours(next.hours),
  };
}

export function localToday(from = new Date()) {
  const y = from.getFullYear();
  const m = String(from.getMonth() + 1).padStart(2, "0");
  const d = String(from.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addLocalDays(isoDate: string, days: number) {
  const [y, m, d] = String(isoDate).slice(0, 10).split("-").map(Number);
  const dt = new Date(y || 1970, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  return localToday(dt);
}

/** 0 = any future day. 5 = today through today+5. */
export function bookingDateMax(advanceDays: unknown): string | undefined {
  const n = Number(advanceDays);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return addLocalDays(localToday(), Math.floor(n));
}

export function isBookableDate(date: string, advanceDays: unknown) {
  const day = String(date).slice(0, 10);
  if (!day || day < localToday()) return false;
  const max = bookingDateMax(advanceDays);
  return !max || day <= max;
}

/** Seed rules for a new org (e.g. after registration). */
export function persistBookingRules(orgId: EntityId, rules: BookingRules) {
  writeStored(orgId, normalizeBookingRules(rules));
}

export function parseBookingRules(raw: string | number | undefined): BookingRules | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BookingRules>;
    const base = defaultBookingRules();
    return normalizeBookingRules({
      ...base,
      ...parsed,
      hours: Array.isArray(parsed.hours) && parsed.hours.length ? parsed.hours : base.hours,
      onlineBooking: parsed.onlineBooking !== false,
    });
  } catch {
    return null;
  }
}

export function readBookingRules(orgRow: Row | undefined | null, orgId?: EntityId): BookingRules {
  const fromRow = parseBookingRules(orgRow?.["bookingRules"]);
  const id = String(orgId ?? orgRow?.["orgId"] ?? "");
  const stored = id ? readAllStored()[id] : undefined;
  return normalizeBookingRules(stored ?? fromRow ?? defaultBookingRules());
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
  const { allRows, applyCache, update } = useData();
  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId)),
    [allRows, orgId],
  );
  const rules = useMemo(() => readBookingRules(orgRow, orgId), [orgRow, orgId]);

  const save = useCallback(
    (next: BookingRules) => {
      const cleaned = normalizeBookingRules(next);
      writeStored(orgId, cleaned);
      applyCache((prev) => ({
        ...prev,
        organizations: (prev["organizations"] ?? []).map((row) =>
          String(row["orgId"]) === String(orgId) ? { ...row, bookingRules: JSON.stringify(cleaned) } : row,
        ),
      }));
      if (orgRow) {
        update("organizations", String(orgRow.id), {
          ...orgRow,
          bookingRules: JSON.stringify(cleaned),
        });
      }
    },
    [applyCache, orgId, orgRow, update],
  );

  return { rules, save };
}
