import type { Row } from "@/lib/store";

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

/** True when the stylist is free for the whole service duration at that location/date. */
export function isSlotFree(
  appointments: Row[],
  opts: { staff: string; date: string; time: string; duration: number; locationId: string },
) {
  const start = toMinutes(opts.time);
  const end = start + opts.duration;
  return !appointments.some((a) => {
    if (String(a["locationId"]) !== opts.locationId) return false;
    if (String(a["date"]) !== opts.date) return false;
    if (String(a["staff"]) !== opts.staff) return false;
    if (["Cancelled", "No-show"].includes(String(a["status"]))) return false;
    const s = toMinutes(String(a["time"] ?? "00:00"));
    const e = s + Number(a["duration"] ?? 60);
    return start < e && s < end;
  });
}
