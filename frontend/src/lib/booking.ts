import type { EntityId } from "@/lib/ids";
import type { Db, Row } from "@/lib/store";

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

function weekdayName(date: string) {
  const day = dateOf(date);
  if (!day) return "";
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

/** Shift for this stylist, otherwise the salon's opening hours for that weekday. */
export function openingWindow(
  shifts: Row[],
  date: string,
  staffId?: string | number,
  hours?: DayWindow[],
) {
  const day = dateOf(date);
  const shift = shifts.find((s) => {
    if (dateOf(String(s["date"] ?? "")) !== day) return false;
    if (staffId && String(s["staffId"] ?? "") !== String(staffId)) return false;
    return Boolean(clockOf(String(s["startTime"] ?? "")) && clockOf(String(s["endTime"] ?? "")));
  });
  if (shift) {
    const open = clockOf(String(shift["startTime"] ?? "")) || DEFAULT_OPEN;
    const close = clockOf(String(shift["endTime"] ?? "")) || DEFAULT_CLOSE;
    if (toMinutes(open) < toMinutes(close)) return { open, close, closed: false };
  }
  const configured = hours?.find((h) => h.day === weekdayName(date));
  if (configured && !configured.open) return { open: "00:00", close: "00:00", closed: true };
  if (configured?.open) {
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
  const span = Math.max(15, duration || step);
  for (let m = start; m + span <= end; m += step) out.push(fromMinutes(m));
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
