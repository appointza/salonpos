import type { EntityId } from "@/lib/ids";
import type { Row } from "@/lib/store";
import { isSlotFree, openingWindow, toMinutes } from "@/lib/booking";
import { readBookingRules } from "@/lib/booking-rules";
import { approvedLeaveOn, shiftOn, staffById } from "@/lib/hr";
import { emitBusinessEvent } from "@/lib/business/event-bus";
import type { BusinessStore } from "@/lib/business/types";

export type AppointmentBookingInput = {
  orgId: EntityId;
  locationId: EntityId;
  staffId?: string;
  staffName: string;
  date: string;
  time: string;
  duration: number;
  serviceId?: string;
};

export type AppointmentValidation = { ok: true } | { ok: false; error: string };

/** Availability engine: shift + leave + overlapping appointments. */
export function validateAppointmentBooking(
  db: Record<string, Row[]>,
  input: AppointmentBookingInput,
): AppointmentValidation {
  const appointments = (db["appointments"] ?? []).filter((a) => String(a["orgId"]) === String(input.orgId));
  const leaves = (db["leaves"] ?? []).filter((l) => String(l["orgId"]) === input.orgId);
  const shifts = (db["shifts"] ?? []).filter((s) => String(s["orgId"]) === input.orgId);
  const staff = (db["staff"] ?? []).filter((s) => String(s["orgId"]) === input.orgId);

  const staffRow = input.staffId
    ? staffById(staff, input.staffId)
    : staff.find((s) => String(s["name"]).toLowerCase() === input.staffName.trim().toLowerCase());
  const staffId = String(staffRow?.id ?? input.staffId ?? "");

  if (staffRow && String(staffRow["status"] ?? "Active") !== "Active") {
    return { ok: false, error: "Selected stylist is not active" };
  }

  if (staffId) {
    const leave = approvedLeaveOn(leaves, staffId, input.date);
    if (leave) {
      return {
        ok: false,
        error: `${input.staffName} is on approved leave (${String(leave["fromDate"])} – ${String(leave["toDate"])})`,
      };
    }

    const orgHasShifts = shifts.length > 0;
    if (orgHasShifts) {
      const shift = shiftOn(shifts, staffId, input.date);
      if (!shift) {
        return { ok: false, error: `No shift scheduled for ${input.staffName} on ${input.date}` };
      }
    }
  }

  const orgRow = (db["organizations"] ?? []).find((o) => String(o["orgId"]) === String(input.orgId));
  const rules = readBookingRules(orgRow, input.orgId);
  if (!rules.onlineBooking) return { ok: false, error: "Online booking is turned off" };
  const window = openingWindow(shifts, input.date, staffId, rules.hours);
  if (window.closed) return { ok: false, error: "The salon is closed that day" };
  const noticeHours = Math.max(0, Number(rules.minNotice) || 0);
  if (noticeHours > 0) {
    const when = new Date(`${String(input.date).slice(0, 10)}T${input.time || "00:00"}`);
    if (when.getTime() < Date.now() + noticeHours * 60 * 60 * 1000) {
      return { ok: false, error: `Book at least ${noticeHours} hours ahead` };
    }
  }
  const start = toMinutes(input.time);
  const finish = start + Math.max(15, input.duration || 30);
  if (start < toMinutes(window.open) || finish > toMinutes(window.close)) {
    return { ok: false, error: `Bookings are only open ${window.open}–${window.close}` };
  }

  if (
    !isSlotFree(appointments, {
      staff: input.staffName,
      staffId,
      date: input.date,
      time: input.time,
      duration: input.duration,
      locationId: input.locationId,
    })
  ) {
    return { ok: false, error: "That time is already booked — pick another slot" };
  }

  return { ok: true };
}

export function completeAppointment(
  store: BusinessStore,
  input: { appointmentId: EntityId; invoiceId: EntityId; orgId: EntityId; locationId: EntityId },
) {
  const appt = (store.db["appointments"] ?? []).find((a) => String(a.id) === input.appointmentId);
  if (!appt) return { ok: false, error: "Appointment not found" };

  store.update("appointments", input.appointmentId, {
    ...appt,
    status: "Completed",
    invoice: input.invoiceId,
    invoiceId: input.invoiceId,
  });

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  emitBusinessEvent(store, {
    type: "APPOINTMENT_COMPLETED",
    orgId: input.orgId,
    locationId: input.locationId,
    at: stamp,
    entityId: input.appointmentId,
    customerId: String(appt["customerId"] ?? ""),
    payload: { invoiceId: input.invoiceId },
  });

  return { ok: true };
}

export function cancelAppointment(
  store: BusinessStore,
  input: { appointmentId: EntityId; orgId: EntityId; locationId: EntityId; reason?: string },
) {
  const appt = (store.db["appointments"] ?? []).find((a) => String(a.id) === input.appointmentId);
  if (!appt) return { ok: false, error: "Appointment not found" };

  store.update("appointments", input.appointmentId, {
    ...appt,
    status: "Cancelled",
    cancelReason: input.reason ?? "",
  });

  emitBusinessEvent(store, {
    type: "APPOINTMENT_CANCELLED",
    orgId: input.orgId,
    locationId: input.locationId,
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    entityId: input.appointmentId,
    customerId: String(appt["customerId"] ?? ""),
  });

  return { ok: true };
}
