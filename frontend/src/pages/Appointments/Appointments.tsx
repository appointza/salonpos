import { toast } from "sonner";
import { CrudPage } from "@/components/CrudPage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { modules } from "@/lib/modules";
import { resolveStaffForUser } from "@/lib/staff-scope";
import { enrichAppointmentRow } from "@/lib/appointments/appointment-resolve";
import { useCollection, useData, type Row } from "@/lib/store";

const title = "Appointments — Luxe Salon CRM";
const description = "Create, reschedule and track salon bookings across outlets and stylists.";
const STATUS_OPTIONS =
  modules.appointments.fields.find((f) => f.name === "status")?.options ?? [
    "Pending",
    "Confirmed",
    "Completed",
    "Cancelled",
    "No-show",
  ];

export function Page() {
  const { user } = useAuth();
  const { allRows, orgId } = useData();
  const { update } = useCollection("appointments");
  const isStylist = user?.role === "STYLIST";
  const me = resolveStaffForUser(
    (allRows["staff"] ?? []).filter((s) => String(s["orgId"]) === orgId),
    user,
  );
  const myName = String(me?.["name"] ?? user?.name ?? "");
  const customers = (allRows["customers"] ?? []).filter((c) => String(c["orgId"]) === orgId);
  const services = (allRows["services"] ?? []).filter((c) => String(c["orgId"]) === orgId);
  const staffRows = (allRows["staff"] ?? []).filter((c) => String(c["orgId"]) === orgId);

  function withAppointmentIds(row: Row) {
    return enrichAppointmentRow(row, customers, services, staffRows);
  }

  function setStatus(row: Row, status: string) {
    if (status === String(row["status"] ?? "")) return;
    update(String(row.id), { ...row, status });
    toast.success("Status updated", { description: `${String(row.id)} · ${status}` });
  }

  return (
    <CrudPage
      module={{
        ...modules.appointments,
        subtitle: isStylist
          ? "Your bookings only. Change status from the list — customer, time and stylist stay as booked."
          : modules.appointments.subtitle,
      }}
      canCreate={!isStylist}
      canEdit={!isStylist}
      canDelete={!isStylist}
      prepareNew={(row) => {
        const next = withAppointmentIds(row);
        return isStylist && me
          ? {
              ...next,
              staff: myName,
              staffId: String(me.id),
              locationId: String(me["locationId"] ?? next["locationId"]),
              outlet: String(me["outlet"] ?? next["outlet"]),
            }
          : next;
      }}
      prepareSave={(row) => {
        const next = withAppointmentIds(row);
        return isStylist && me
          ? {
              ...next,
              staff: myName,
              staffId: String(me.id),
              locationId: String(me["locationId"] ?? next["locationId"]),
              outlet: String(me["outlet"] ?? next["outlet"]),
            }
          : next;
      }}
      selectOptions={(field) =>
        field.name === "staff" && isStylist && myName ? [{ value: myName, label: myName }] : undefined
      }
      lockedFields={isStylist ? ["staff", "outlet"] : []}
      renderCell={(field, row, text) => {
        if (field.name !== "status" || !isStylist) return undefined;
        return (
          <Select value={String(row["status"] ?? text)} onValueChange={(v) => setStatus(row, v)}>
            <SelectTrigger
              className="h-8 w-[9.5rem] justify-between"
              aria-label={`Status for ${String(row.id)}`}
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }}
    />
  );
}
