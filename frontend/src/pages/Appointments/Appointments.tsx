import { Link } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import { CrudPage, type ModuleDef } from "@/components/CrudPage";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { resolveStaffForUser } from "@/pages/Staff/staff-scope";
import { enrichAppointmentRow } from "@/pages/Appointments/appointment-resolve";
import { useCollection, useData, type Row } from "@/store";

const title = "Appointments — Luxe Salon CRM";
const description = "Create, reschedule and track salon bookings across outlets and stylists.";
const STATUS_OPTIONS = ["Pending", "Confirmed", "Completed", "Cancelled", "No-show"];

const appointmentsModule: ModuleDef = {
  key: "appointments",
  title: "Appointments",
  subtitle: "Bookings across outlets, stylists and channels.",
  idPrefix: "A-",
  fields: [
    { name: "customer", label: "Customer", type: "select", table: true },
    { name: "service", label: "Service", table: true },
    { name: "staff", label: "Stylist", type: "select", table: true },
    { name: "outlet", label: "Outlet", type: "select", options: ["All"], table: true },
    { name: "date", label: "Date", type: "date", table: true },
    { name: "time", label: "Time", type: "time", table: true },
    { name: "duration", label: "Duration (min)", type: "number" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, table: true, badge: true },
    { name: "source", label: "Source", type: "select", options: ["Walk-in", "Phone", "WhatsApp", "Instagram", "Customer App"] },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
};

export function Page() {
  const { user } = useAuth();
  const { allRows, orgId } = useData();
  const { update } = useCollection("appointments");
  const isStylist = user?.role === "STYLIST";
  const me = resolveStaffForUser(
    (allRows["staff"] ?? []).filter((s) => String(s["orgId"]) === String(orgId)),
    user,
  );
  const myName = String(me?.["name"] ?? user?.name ?? "");
  const customers = (allRows["customers"] ?? []).filter((c) => String(c["orgId"]) === orgId);
  const services = (allRows["services"] ?? []).filter((c) => String(c["orgId"]) === orgId);
  const staffRows = (allRows["staff"] ?? []).filter((c) => String(c["orgId"]) === orgId);

  function withAppointmentIds(row: Row) {
    return enrichAppointmentRow(row, customers, services, staffRows);
  }

  function canBill(row: Row) {
    const status = String(row["status"] ?? "");
    if (status === "Completed" || status === "Cancelled" || status === "No-show") return false;
    if (row["invoiceId"] || row["invoice"]) return false;
    return true;
  }

  function setStatus(row: Row, status: string) {
    if (status === String(row["status"] ?? "")) return;
    update(String(row.id), { ...row, status });
    toast.success("Status updated", { description: `${String(row.id)} · ${status}` });
  }

  return (
    <CrudPage
      module={{
        ...appointmentsModule,
        subtitle: isStylist
          ? "Your bookings only. Change status from the list — customer, time and stylist stay as booked."
          : appointmentsModule.subtitle,
      }}
      canCreate={!isStylist}
      canEdit={!isStylist}
      canDelete={!isStylist}
      prepareNew={(row) => {
        const next = withAppointmentIds({
          ...row,
          status: String(row["status"] ?? "").trim() || "Pending",
        });
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
      rowActions={(row) =>
        canBill(row) ? (
          <Button asChild size="sm" variant="secondary" className="mr-1 h-8">
            <Link to="/pos" search={{ appointment: String(row.id) }}>
              <Receipt className="size-3.5" />
              Bill
            </Link>
          </Button>
        ) : String(row["status"]) === "Completed" || row["invoiceId"] || row["invoice"] ? (
          <span className="mr-1 text-xs text-muted-foreground">Billed</span>
        ) : null
      }
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
