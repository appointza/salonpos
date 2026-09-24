import type { EntityId } from "@/lib/ids";
import type { Row } from "@/lib/store";
import { toMinutes } from "@/lib/booking";

export const LATE_GRACE_MIN = 5;
export const EARLY_GRACE_MIN = 10;
export const STANDARD_DAY_HOURS = 8;

export function staffName(staff: Row[] | Row | undefined, id?: string | number) {
  if (!staff) return "—";
  if (!Array.isArray(staff)) return String(staff["name"] ?? "—");
  const row = staff.find((s) => String(s.id) === String(id ?? ""));
  return row ? String(row["name"]) : String(id || "—");
}

export function staffById(staff: Row[], id: string | number) {
  return staff.find((s) => String(s.id) === String(id)) ?? null;
}

export function staffIdFromName(staff: Row[], name: string) {
  const n = name.trim().toLowerCase();
  return staff.find((s) => String(s["name"]).toLowerCase() === n)?.id;
}

export function eachDate(from: string, to: string) {
  const out: string[] = [];
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function monthRange(period: string) {
  const [y, m] = period.split("-").map(Number);
  const last = new Date(y ?? 2026, m ?? 1, 0).getDate();
  const mm = String(m ?? 1).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

export function leaveDays(fromDate: string, toDate: string) {
  if (!fromDate || !toDate || toDate < fromDate) return 0;
  return eachDate(fromDate, toDate).length;
}

export function hoursBetween(start: string, end: string) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round(((toMinutes(end) - toMinutes(start)) / 60) * 10) / 10);
}

export function approvedLeaveOn(leaves: Row[], staffId: EntityId, date: string) {
  return (
    leaves.find(
      (l) =>
        String(l["staffId"]) === staffId &&
        String(l["status"]) === "Approved" &&
        String(l["fromDate"] ?? "") <= date &&
        date <= String(l["toDate"] ?? ""),
    ) ?? null
  );
}

export function shiftOn(shifts: Row[], staffId: EntityId, date: string) {
  return shifts.find((s) => String(s["staffId"]) === staffId && String(s["date"]) === date) ?? null;
}

export function punchOn(punches: Row[], staffId: EntityId, date: string) {
  return punches.find((p) => String(p["staffId"]) === staffId && String(p["date"]) === date) ?? null;
}

export type DerivedAttendance = {
  date: string;
  staffId: EntityId;
  staffName: string;
  locationId: EntityId;
  shiftId: string;
  shiftStart: string;
  shiftEnd: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  overtime: number;
  status: string;
  remarks: string;
  punchId: string;
  leaveId: string;
};

export function deriveAttendanceDay(input: {
  date: string;
  staff: Row;
  shift: Row | null;
  punch: Row | null;
  leave: Row | null;
  today?: string;
}): DerivedAttendance {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const staffId = String(input.staff.id);
  const shiftStart = String(input.shift?.["startTime"] ?? "");
  const shiftEnd = String(input.shift?.["endTime"] ?? "");
  const checkIn = String(input.punch?.["checkIn"] ?? "");
  const checkOut = String(input.punch?.["checkOut"] ?? "");
  const shiftHours = hoursBetween(shiftStart, shiftEnd);
  const worked = hoursBetween(checkIn, checkOut);
  let status = "—";
  let remarks = String(input.punch?.["remarks"] ?? "");

  if (input.leave) {
    status = "Leave";
    remarks = String(input.leave["type"] ?? "Leave");
  } else if (checkIn) {
    const late = shiftStart && toMinutes(checkIn) > toMinutes(shiftStart) + LATE_GRACE_MIN;
    const early = checkOut && shiftEnd && toMinutes(checkOut) < toMinutes(shiftEnd) - EARLY_GRACE_MIN;
    if (late) status = "Late";
    else if (early) status = "Early";
    else status = "Present";
  } else if (input.shift && String(input.shift["status"]) === "Published" && input.date < today) {
    status = "Absent";
  } else if (input.shift) {
    status = "Scheduled";
  }

  const overtime = status === "Leave" || status === "Absent" ? 0 : Math.max(0, Math.round((worked - (shiftHours || STANDARD_DAY_HOURS)) * 10) / 10);

  return {
    date: input.date,
    staffId,
    staffName: String(input.staff["name"]),
    locationId: String(input.shift?.["locationId"] ?? input.punch?.["locationId"] ?? input.staff["locationId"] ?? ""),
    shiftId: input.shift ? String(input.shift.id) : "",
    shiftStart,
    shiftEnd,
    checkIn,
    checkOut,
    hours: input.leave ? 0 : worked,
    overtime: overtime > 0 ? overtime : 0,
    status,
    remarks,
    punchId: input.punch ? String(input.punch.id) : "",
    leaveId: input.leave ? String(input.leave.id) : "",
  };
}

export function deriveAttendanceRows(opts: {
  from: string;
  to: string;
  staff: Row[];
  shifts: Row[];
  punches: Row[];
  leaves: Row[];
}) {
  const rows: DerivedAttendance[] = [];
  for (const person of opts.staff) {
    const id = String(person.id);
    for (const date of eachDate(opts.from, opts.to)) {
      const shift = shiftOn(opts.shifts, id, date);
      const punch = punchOn(opts.punches, id, date);
      const leave = approvedLeaveOn(opts.leaves, id, date);
      if (!shift && !punch && !leave) continue;
      rows.push(deriveAttendanceDay({ date, staff: person, shift, punch, leave }));
    }
  }
  return rows.sort((a, b) => (a.date === b.date ? a.staffName.localeCompare(b.staffName) : b.date.localeCompare(a.date)));
}

export type PayrollCalc = {
  staffId: EntityId;
  staffName: string;
  locationId: EntityId;
  period: string;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  unpaidDays: number;
  absentDays: number;
  overtimeHours: number;
  baseSalary: number;
  commission: number;
  incentive: number;
  overtimePay: number;
  extraDeductions: number;
  unpaidDeduction: number;
  absentDeduction: number;
  deductions: number;
  netPay: number;
  status: string;
  payDate: string;
  payrollId: string;
};

export function payrollForStaff(opts: {
  staff: Row;
  period: string;
  attendance: DerivedAttendance[];
  commissions: Row[];
  adjustment: Row | null;
}): PayrollCalc {
  const staffId = String(opts.staff.id);
  const days = opts.attendance.filter((d) => d.staffId === staffId);
  const { from, to } = monthRange(opts.period);
  const commission = opts.commissions
    .filter((c) => String(c["staffId"]) === staffId && String(c["date"] ?? "") >= from && String(c["date"] ?? "") <= to)
    .reduce((s, c) => s + Number(c["amount"] ?? 0), 0);
  const baseSalary = Number(opts.staff["baseSalary"] ?? 0);
  const daily = baseSalary / 30;
  const unpaidDays = days.filter((d) => d.status === "Leave" && /unpaid/i.test(d.remarks)).length;
  const leaveDaysCount = days.filter((d) => d.status === "Leave").length;
  const presentDays = days.filter((d) => ["Present", "Late", "Early"].includes(d.status)).length;
  const absentDays = days.filter((d) => d.status === "Absent").length;
  const workingDays = days.filter((d) => d.shiftId || ["Present", "Late", "Early", "Absent"].includes(d.status)).length;
  const overtimeHours = days.reduce((s, d) => s + d.overtime, 0);
  const overtimePay = Math.round((overtimeHours * (daily / STANDARD_DAY_HOURS)) * 1.5);
  const incentive = Number(opts.adjustment?.["incentive"] ?? 0);
  const extraDeductions = Number(opts.adjustment?.["extraDeductions"] ?? 0);
  const unpaidDeduction = Math.round(unpaidDays * daily);
  const absentDeduction = Math.round(absentDays * daily);
  const deductions = extraDeductions + unpaidDeduction + absentDeduction;
  const netPay = Math.round(baseSalary + commission + incentive + overtimePay - deductions);

  return {
    staffId,
    staffName: String(opts.staff["name"]),
    locationId: String(opts.staff["locationId"] ?? ""),
    period: opts.period,
    workingDays,
    presentDays,
    leaveDays: leaveDaysCount,
    unpaidDays,
    absentDays,
    overtimeHours,
    baseSalary,
    commission: Math.round(commission),
    incentive,
    overtimePay,
    extraDeductions,
    unpaidDeduction,
    absentDeduction,
    deductions,
    netPay,
    status: String(opts.adjustment?.["status"] ?? "Draft"),
    payDate: String(opts.adjustment?.["payDate"] ?? ""),
    payrollId: opts.adjustment ? String(opts.adjustment.id) : "",
  };
}
