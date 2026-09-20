import type { Row } from "@/lib/store";
import { isSlotFree } from "@/lib/booking";
import { approvedLeaveOn, shiftOn, staffById } from "@/lib/hr";
import { emitBusinessEvent } from "@/lib/business/event-bus";
import type { BusinessStore } from "@/lib/business/types";

export type AppointmentBookingInput = {
  orgId: string;
  locationId: string;
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
  const appointments = (db["appointments"] ?? []).filter((a) => String(a["orgId"]) === input.orgId);
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

  if (
    !isSlotFree(appointments, {
      staff: input.staffName,
      date: input.date,
      time: input.time,
      duration: input.duration,
      locationId: input.locationId,
    })
  ) {
    return { ok: false, error: "That slot was just taken — pick another time" };
  }

  return { ok: true };
}

export function completeAppointment(
  store: BusinessStore,
  input: { appointmentId: string; invoiceId: string; orgId: string; locationId: string },
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
  input: { appointmentId: string; orgId: string; locationId: string; reason?: string },
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
