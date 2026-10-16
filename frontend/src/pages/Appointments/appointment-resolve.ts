import type { EntityId } from "@/ids";
import type { Row } from "@/store";

export function resolveAppointmentCustomerId(appointment: Row, customers: Row[]) {
  if (appointment["customerId"]) return String(appointment["customerId"]);
  const name = String(appointment["customer"] ?? "").trim();
  if (!name) return "";
  return String(customers.find((c) => String(c["name"] ?? "").trim() === name)?.id ?? "");
}

export function resolveAppointmentServiceId(appointment: Row, services: Row[]) {
  const ids = parseAppointmentServiceIds(appointment);
  if (ids.length) return ids[0]!;
  const name = String(appointment["service"] ?? "").trim();
  if (!name) return "";
  const parts = name.split(/\s+\+\s+|\s*,\s*/).map((p) => p.trim()).filter(Boolean);
  const first = services.find((s) => String(s["name"] ?? "").trim() === (parts[0] ?? name));
  return String(first?.id ?? "");
}

export function serializeAppointmentServiceIds(ids: Array<string | number | undefined | null>): string {
  const unique: string[] = [];
  for (const raw of ids) {
    const n = Number(raw);
    const id = Number.isFinite(n) && n > 0 ? String(n) : String(raw ?? "").trim();
    if (!id || id === "0" || unique.includes(id)) continue;
    unique.push(id);
  }
  return unique.join(",");
}

export function parseAppointmentServiceIds(appointment: Row): string[] {
  const raw = appointment["serviceIds"];
  const fromList: string[] = [];
  if (typeof raw === "string" && raw.trim()) {
    const text = raw.trim();
    if (text.startsWith("[")) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (Array.isArray(parsed)) fromList.push(...parsed.map((x) => String(x)));
      } catch {
        /* ignore */
      }
    } else {
      fromList.push(...text.split(/[,|]/));
    }
  } else if (Array.isArray(raw)) {
    fromList.push(...raw.map((x) => String(x)));
  }
  const primary = appointment["serviceId"];
  if (primary !== undefined && primary !== null && String(primary).trim() && String(primary) !== "0") {
    fromList.push(String(primary));
  }
  return serializeAppointmentServiceIds(fromList).split(",").filter(Boolean);
}

export function resolveAppointmentServiceRows(appointment: Row, services: Row[]): Row[] {
  const ids = parseAppointmentServiceIds(appointment);
  const rows = ids
    .map((id) => services.find((s) => String(s.id) === id) ?? null)
    .filter((s): s is Row => Boolean(s));
  if (rows.length) return rows;
  const name = String(appointment["service"] ?? "").trim();
  if (name) {
    const parts = name.split(/\s+\+\s+|\s*,\s*/).map((p) => p.trim()).filter(Boolean);
    const fromNames = parts
      .map((part) => services.find((s) => String(s["name"] ?? "").trim() === part) ?? null)
      .filter((s): s is Row => Boolean(s));
    if (fromNames.length) return fromNames;
  }
  const one = resolveServiceRow(appointment, services);
  return one ? [one] : [];
}

export function appointmentServiceLabel(appointment: Row, services: Row[]): string {
  const names = resolveAppointmentServiceRows(appointment, services)
    .map((s) => String(s["name"] ?? "").trim())
    .filter(Boolean);
  if (names.length) return names.join(", ");
  return String(appointment["service"] ?? appointment["serviceName"] ?? "").trim();
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
  serviceIds?: Array<string | number>;
  serviceNames?: string[];
  staffName: string;
  staff?: Row | null;
  locationId: EntityId;
  outlet: string;
  date: string;
  time: string;
  duration: number;
  status?: string;
  source: string;
  notes?: string;
  id?: string;
};

/** New appointments store service ids; names are resolved for display and billing. */
export function buildAppointmentRow(input: BuildAppointmentInput): Row {
  const staffRow = input.staff ?? null;
  const staffName = input.staffName || String(staffRow?.["name"] ?? "");
  const serviceIds = serializeAppointmentServiceIds(input.serviceIds?.length ? input.serviceIds : [input.service.id]);
  const primaryId = serviceIds.split(",")[0] || String(input.service.id);
  const serviceName =
    (input.serviceNames ?? []).map((n) => n.trim()).filter(Boolean).join(", ") || String(input.service["name"] ?? "").trim();
  return {
    id: input.id ?? `A-${Math.floor(5000 + Math.random() * 4999)}`,
    customerId: String(input.customer.id),
    customer: String(input.customer["name"] ?? ""),
    serviceId: primaryId,
    serviceIds,
    service: serviceName,
    serviceName,
    staffId: staffRow ? String(staffRow.id) : "",
    staff: staffName,
    outlet: input.outlet,
    date: input.date,
    time: input.time,
    duration: input.duration,
    status: input.status ?? "Pending",
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
  const staffRow = staff.find((s) => String(s.id) === staffId);
  const serviceIds = serializeAppointmentServiceIds([...parseAppointmentServiceIds(row), serviceId]);
  const label = appointmentServiceLabel({ ...row, serviceId, serviceIds }, services) || String(row["service"] ?? row["serviceName"] ?? "");
  return {
    ...row,
    ...(customerId ? { customerId } : {}),
    ...(customer ? { customer: String(customer["name"]) } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(serviceIds ? { serviceIds } : {}),
    service: label,
    serviceName: label,
    ...(staffId ? { staffId } : {}),
    ...(staffRow ? { staff: String(staffRow["name"]) } : {}),
  };
}
