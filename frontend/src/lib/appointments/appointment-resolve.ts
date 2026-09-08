import type { Row } from "@/lib/store";

export function resolveAppointmentCustomerId(appointment: Row, customers: Row[]) {
  if (appointment["customerId"]) return String(appointment["customerId"]);
  const name = String(appointment["customer"] ?? "").trim();
  if (!name) return "";
  return String(customers.find((c) => String(c["name"] ?? "").trim() === name)?.id ?? "");
}

export function resolveAppointmentServiceId(appointment: Row, services: Row[]) {
  if (appointment["serviceId"]) return String(appointment["serviceId"]);
  const name = String(appointment["service"] ?? "").trim();
  if (!name) return "";
  return String(services.find((s) => String(s["name"] ?? "").trim() === name)?.id ?? "");
}

export function resolveAppointmentStaffId(appointment: Row, staff: Row[]) {
  if (appointment["staffId"]) return String(appointment["staffId"]);
  const name = String(appointment["staff"] ?? "").trim();
  if (!name) return "";
  return String(staff.find((s) => String(s["name"] ?? "").trim() === name)?.id ?? "");
}

export function resolveCustomerRow(appointment: Row, customers: Row[]) {
  const id = resolveAppointmentCustomerId(appointment, customers);
  return id ? (customers.find((c) => String(c.id) === id) ?? null) : null;
}

export function resolveServiceRow(appointment: Row, services: Row[]) {
  const id = resolveAppointmentServiceId(appointment, services);
  return id ? (services.find((s) => String(s.id) === id) ?? null) : null;
}

export type BuildAppointmentInput = {
  customer: Row;
  service: Row;
  staffName: string;
  staff?: Row | null;
  locationId: string;
  outlet: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  source: string;
  notes?: string;
  id?: string;
};

/** New appointments carry stable IDs plus denormalized names for display/backward compat. */
export function buildAppointmentRow(input: BuildAppointmentInput): Row {
  const staffRow = input.staff ?? null;
  const staffName = input.staffName || String(staffRow?.["name"] ?? "");
  return {
    id: input.id ?? `A-${Math.floor(5000 + Math.random() * 4999)}`,
    customerId: String(input.customer.id),
    customer: String(input.customer["name"] ?? ""),
    serviceId: String(input.service.id),
    service: String(input.service["name"] ?? ""),
    staffId: staffRow ? String(staffRow.id) : "",
    staff: staffName,
    outlet: input.outlet,
    date: input.date,
    time: input.time,
    duration: input.duration,
    status: input.status,
    source: input.source,
    notes: input.notes ?? "",
    locationId: input.locationId,
  };
}

export function enrichAppointmentRow(
  row: Row,
  customers: Row[],
  services: Row[],
  staff: Row[],
): Row {
  const customerId = resolveAppointmentCustomerId(row, customers);
  const serviceId = resolveAppointmentServiceId(row, services);
  const staffId = resolveAppointmentStaffId(row, staff);
  const customer = customers.find((c) => String(c.id) === customerId);
  const service = services.find((s) => String(s.id) === serviceId);
  const staffRow = staff.find((s) => String(s.id) === staffId);
  return {
    ...row,
    ...(customerId ? { customerId } : {}),
    ...(customer ? { customer: String(customer["name"]) } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(service ? { service: String(service["name"]) } : {}),
    ...(staffId ? { staffId } : {}),
    ...(staffRow ? { staff: String(staffRow["name"]) } : {}),
  };
}
