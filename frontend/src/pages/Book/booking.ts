import type { EntityId } from "@/ids";
import type { Db, Row } from "@/store";

export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export const fromMinutes = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function slotList(open = "09:00", close = "20:00", step = 30) {
  const out: string[] = [];
  for (let m = toMinutes(open); m + step <= toMinutes(close); m += step) out.push(fromMinutes(m));
  return out;
}

/** Outlet catalogue. Unassigned rows stay visible. If the outlet has none, show the whole org catalogue. */
export function rowsAtLocation(rows: Row[], orgId: EntityId, locationId: EntityId) {
  const orgRows = rows.filter((r) => String(r["orgId"]) === String(orgId));
  if (locationId === "" || locationId === undefined || locationId === null) return orgRows;
  const here = orgRows.filter((r) => {
    const loc = r["locationId"];
    if (loc === undefined || loc === null || loc === "" || Number(loc) === 0) return true;
    return String(loc) === String(locationId);
  });
  return here.length ? here : orgRows;
}

export function isBookableStaff(row: Row) {
  const status = String(row["status"] ?? "").trim().toLowerCase();
  return status === "" || status === "active";
}

export function isPublishedService(row: Row) {
  return String(row["active"] ?? "Yes").trim().toLowerCase() !== "no";
}

export function dbWithRow(db: Db, collection: string, row: Row): Db {
  const list = db[collection] ?? [];
  const rest = list.filter((r) => String(r.id) !== String(row.id));
  return { ...db, [collection]: [row, ...rest] };
}

export const DEFAULT_OPEN = "09:00";
export const DEFAULT_CLOSE = "20:00";

function clockOf(value: string) {
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${match[1]!.padStart(2, "0")}:${match[2]}`;
}

function dateOf(value: string) {
  return String(value).slice(0, 10);
}

const CLOSED = new Set(["cancelled", "no-show", "inactive"]);

export type DayWindow = { day: string; open: boolean; from: string; to: string };

function weekdayIndexFromName(day: string) {
  const key = String(day).trim().toLowerCase();
  const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const short = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const i = names.indexOf(key);
  if (i >= 0) return i;
  return short.indexOf(key.slice(0, 3));
}

function weekdayIndexFromDate(date: string) {
  const [y, m, d] = dateOf(date).split("-").map(Number);
  if (!y || !m || !d) return -1;
  return new Date(y, m - 1, d).getDay();
}

export function hoursForDate(hours: DayWindow[] | undefined, date: string) {
  const idx = weekdayIndexFromDate(date);
  if (idx < 0 || !hours?.length) return undefined;
  return hours.find((h) => weekdayIndexFromName(h.day) === idx);
}

function isOffWeekday(offValue: string, date: string) {
  const v = String(offValue).trim().toLowerCase();
  if (!v) return false;
  if (v === "true" || v === "yes" || v === "1") return true;
  const idx = weekdayIndexFromDate(date);
  if (idx < 0) return false;
  return weekdayIndexFromName(v) === idx;
}

export function isWeeklyOffOnDate(row: Row | null | undefined, date: string) {
  if (!row) return false;
  return isOffWeekday(String(row["weeklyOff"] ?? ""), date);
}

/** Approved leave or weekly off for this stylist on this calendar day. */
export function staffLeaveOnDate(
  leaves: Row[],
  shifts: Row[],
  staffId: string | number | undefined,
  date: string,
  staffRow?: Row | null,
): { kind: "leave" | "weekly-off" } | null {
  if (staffId === undefined || staffId === null || String(staffId) === "" || String(staffId) === "0") return null;
  const day = dateOf(date);
  const onLeave = leaves.find((l) => {
    if (String(l["staffId"]) !== String(staffId)) return false;
    const status = String(l["status"] ?? "").trim().toLowerCase();
    if (status && status !== "approved") return false;
    const from = String(l["fromDate"] ?? "").slice(0, 10);
    const to = String(l["toDate"] ?? from).slice(0, 10);
    return Boolean(from) && from <= day && day <= to;
  });
  if (onLeave) return { kind: "leave" };
  if (isWeeklyOffOnDate(staffRow, date)) return { kind: "weekly-off" };
  const offShift = shifts.find(
    (s) => String(s["staffId"] ?? "") === String(staffId) && isWeeklyOffOnDate(s, date),
  );
  if (offShift) return { kind: "weekly-off" };
  return null;
}

export function serviceDurationMinutes(value: unknown, fallback = 60) {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Local instant for a calendar date + HH:mm (avoids Invalid Date from ISO strings). */
export function slotTimestamp(date: string, time: string) {
  const [y, mo, d] = String(date).slice(0, 10).split("-").map(Number);
  const [hh, mm] = String(time).split(":").map(Number);
  if (!y || !mo || !d) return Number.NaN;
  return new Date(y, mo - 1, d, hh || 0, mm || 0, 0, 0).getTime();
}

/** This stylist's roster that day, otherwise the salon's opening hours. Never uses another stylist's shift. */
export function openingWindow(
  shifts: Row[],
  date: string,
  staffId?: string | number,
  hours?: DayWindow[],
) {
  const day = dateOf(date);
  const wantStaff = staffId !== undefined && staffId !== null && String(staffId) !== "" && String(staffId) !== "0";
  if (wantStaff) {
    const shift = shifts.find((s) => {
      if (dateOf(String(s["date"] ?? "")) !== day) return false;
      return String(s["staffId"] ?? "") === String(staffId);
    });
    if (shift) {
      if (!isWeeklyOffOnDate(shift, date)) {
        const open = clockOf(String(shift["startTime"] ?? "")) || DEFAULT_OPEN;
        const close = clockOf(String(shift["endTime"] ?? "")) || DEFAULT_CLOSE;
        if (toMinutes(open) < toMinutes(close)) return { open, close, closed: false };
      }
    }
  }
  const configured = hoursForDate(hours, date);
  if (configured && configured.open === false) return { open: "00:00", close: "00:00", closed: true };
  if (configured) {
    const open = clockOf(configured.from) || DEFAULT_OPEN;
    const close = clockOf(configured.to) || DEFAULT_CLOSE;
    if (toMinutes(open) < toMinutes(close)) return { open, close, closed: false };
  }
  return { open: DEFAULT_OPEN, close: DEFAULT_CLOSE, closed: false };
}

/** Times that start and finish inside the opening window. */
export function slotsInWindow(open: string, close: string, duration: number, step = 30) {
  const out: string[] = [];
  const start = toMinutes(open);
  const end = toMinutes(close);
  const tick = Math.max(5, step || 30);
  const span = Math.max(tick, serviceDurationMinutes(duration, tick));
  if (!(end > start) || span > end - start) return out;
  for (let m = start; m + span <= end; m += tick) out.push(fromMinutes(m));
  return out;
}

/** True when this stylist has no overlapping booking that day. */
export function isSlotFree(
  appointments: Row[],
  opts: { staff: string; date: string; time: string; duration: number; locationId: EntityId; staffId?: string | number },
) {
  const start = toMinutes(clockOf(opts.time) || "00:00");
  const end = start + Math.max(15, opts.duration || 30);
  const staffName = opts.staff.trim().toLowerCase();
  const day = dateOf(opts.date);
  return !appointments.some((a) => {
    if (CLOSED.has(String(a["status"] ?? "").trim().toLowerCase())) return false;
    if (dateOf(String(a["date"] ?? "")) !== day) return false;
    const sameStaff =
      (opts.staffId && String(a["staffId"] ?? "") === String(opts.staffId)) ||
      String(a["staff"] ?? "").trim().toLowerCase() === staffName;
    if (!sameStaff) return false;
    const s = toMinutes(clockOf(String(a["time"] ?? "")) || "00:00");
    const e = s + Math.max(15, Number(a["duration"] ?? 60));
    return start < e && s < end;
  });
}
