import type { DayHours } from "@/auth";
import { hoursBetween } from "@/pages/Attendance/hr";
import { hoursForDate, isBookableStaff, openingWindow } from "@/pages/Book/booking";
import type { Row } from "@/store";

export type ShiftWindow = { startTime: string; endTime: string; shiftType: string };

export function locationIdOf(row: { locationId?: unknown }) {
  const loc = row.locationId;
  if (loc === undefined || loc === null || loc === "") return "";
  if (Number(loc) === 0) return "";
  return String(loc);
}

export function staffAtLocation(staff: Row[], locationId: string) {
  const active = staff.filter(isBookableStaff);
  const loc = String(locationId);
  if (!loc) return active;
  return active.filter((s) => {
    const home = locationIdOf(s);
    return !home || home === loc;
  });
}

export function shiftTimesFromHours(hours: DayHours[] | undefined, date: string) {
  const day = hoursForDate(hours, date);
  if (day && day.open === false) return null;
  const window = openingWindow([], date, undefined, hours);
  if (window.closed) return null;
  if (hoursBetween(window.open, window.close) <= 0) return null;
  return { startTime: window.open, endTime: window.close, shiftType: "General" as const };
}

function clock(value: unknown) {
  const match = String(value ?? "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${match[1]!.padStart(2, "0")}:${match[2]}`;
}

function typeForWindow(start: string) {
  const [h] = start.split(":").map(Number);
  if ((h ?? 0) < 12) return "Morning";
  if ((h ?? 0) >= 15) return "Evening";
  return "General";
}

export function windowsFromRow(row: Row): ShiftWindow[] {
  const firstStart = clock(row["startTime"]);
  const firstEnd = clock(row["endTime"]);
  const secondStart = clock(row["splitStart"]);
  const secondEnd = clock(row["splitEnd"]);
  const out: ShiftWindow[] = [];
  if (firstStart && firstEnd && hoursBetween(firstStart, firstEnd) > 0) {
    out.push({ startTime: firstStart, endTime: firstEnd, shiftType: typeForWindow(firstStart) });
  }
  if (secondStart && secondEnd && hoursBetween(secondStart, secondEnd) > 0) {
    out.push({ startTime: secondStart, endTime: secondEnd, shiftType: typeForWindow(secondStart) });
  }
  return out;
}

function alreadyHasShift(rows: Row[], staffId: string, date: string, startTime: string) {
  const day = String(date).slice(0, 10);
  const start = clock(startTime);
  return rows.some(
    (s) =>
      String(s["staffId"] ?? "") === staffId &&
      String(s["date"] ?? "").slice(0, 10) === day &&
      clock(s["startTime"]) === start,
  );
}

export function parseStaffIds(row: Row) {
  const listed = String(row["staffIds"] ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (listed.length) return [...new Set(listed)];
  const one = String(row["staffId"] ?? "").trim();
  return one && one !== "0" ? [one] : [];
}

export function toggleStaffId(selected: string[], id: string) {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

export function eachDateInclusive(from: string, to: string) {
  const start = new Date(`${String(from).slice(0, 10)}T12:00:00`);
  const end = new Date(`${String(to).slice(0, 10)}T12:00:00`);
  const dates: string[] = [];
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return dates;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return dates;
}

/** staff × each day in range × each time window (e.g. 10–13 and 15–21). */
export function plannedShiftRows(input: {
  orgId: string | number;
  locations: { locationId: string | number; name: string }[];
  staff: Row[];
  existing: Row[];
  hours?: DayHours[];
  from: string;
  to: string;
  staffIds?: string[];
  windows?: ShiftWindow[];
}): Row[] {
  const fallbackLoc = String(input.locations[0]?.locationId ?? "");
  const out: Row[] = [];
  const planned = [...input.existing];
  const wanted = new Set((input.staffIds ?? []).map(String).filter(Boolean));

  for (const loc of input.locations) {
    const locId = String(loc.locationId);
    const people = (wanted.size ? input.staff.filter((s) => wanted.has(String(s.id))) : staffAtLocation(input.staff, locId)).filter(
      (person) => {
        if (wanted.size) return isBookableStaff(person);
        const home = locationIdOf(person);
        return home === locId || (!home && locId === fallbackLoc);
      },
    );

    for (const date of eachDateInclusive(input.from, input.to)) {
      const dayWindows = input.windows?.length
        ? input.windows
        : (() => {
            const times = shiftTimesFromHours(input.hours, date);
            return times ? [times] : [];
          })();
      for (const times of dayWindows) {
        for (const person of people) {
          const staffId = String(person.id);
          if (alreadyHasShift(planned, staffId, date, times.startTime)) continue;
          const row: Row = {
            orgId: input.orgId,
            locationId: Number(locId) || locId,
            outlet: loc.name,
            staffId,
            date,
            startTime: times.startTime,
            endTime: times.endTime,
            shiftType: times.shiftType,
            splitStart: "",
            splitEnd: "",
            weeklyOff: "",
            status: "Published",
          };
          out.push(row);
          planned.push(row);
        }
      }
    }
  }
  return out;
}
