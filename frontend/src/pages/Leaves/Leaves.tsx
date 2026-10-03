import { CrudPage, type ModuleDef } from "@/components/CrudPage";
import { useAuth } from "@/hooks/useAuth";
import { leaveDays, placeFromStaff, staffName } from "@/pages/Attendance/hr";
import { resolveStaffForUser } from "@/pages/Staff/staff-scope";
import { useCollection, useData, type Row } from "@/store";

const title = "Leave Requests — Luxe Salon CRM";
const description = "Approved leave is the source of Leave days on Attendance. Days are counted from the date range.";

const leavesModule: ModuleDef = {
  key: "leaves",
  title: "Leave Requests",
  subtitle: "Leave is the source for absence. Attendance reads approved dates; days are counted from From–To.",
  idPrefix: "LV-",
  fields: [
    { name: "staffId", label: "Staff", type: "select", table: true },
    { name: "coverStaffId", label: "Cover staff", type: "select", table: true },
    { name: "type", label: "Leave type", type: "select", options: ["Casual Leave", "Sick Leave", "Paid Leave", "Unpaid Leave"], table: true },
    { name: "fromDate", label: "From", type: "date", table: true },
    { name: "toDate", label: "To", type: "date", table: true },
    { name: "days", label: "Days", type: "number", table: true, form: false },
    { name: "status", label: "Status", type: "select", options: ["Pending", "Approved", "Rejected"], table: true, badge: true },
    { name: "approver", label: "Approver" },
    { name: "reason", label: "Reason", type: "textarea" },
  ],
};

export function Page() {
  const { user } = useAuth();
  const { allRows, orgId, update } = useData();
  const { rows: staff } = useCollection("staff");
  const isStylist = user?.role === "STYLIST";
  const me = resolveStaffForUser(
    (allRows["staff"] ?? []).filter((s) => String(s["orgId"]) === String(orgId)),
    user,
  );
  const options = staff.map((s) => ({ value: String(s.id), label: `${String(s["name"])} · ${String(s["outlet"] || s.id)}` }));

  function coverFor(row: Row) {
    const person = staff.find((s) => String(s.id) === String(row["staffId"] ?? ""));
    return staff
      .filter((s) => String(s.id) !== String(row["staffId"] ?? ""))
      .filter((s) => !person || String(s["locationId"]) === String(person["locationId"]))
      .filter((s) => String(s["status"] ?? "Active") === "Active")
      .map((s) => ({ value: String(s.id), label: String(s["name"]) }));
  }

  function handAppointmentsToCover(row: Row) {
    const coverId = String(row["coverStaffId"] ?? "");
    if (String(row["status"]) !== "Approved" || !coverId || coverId === "0") return;
    const cover = staff.find((s) => String(s.id) === coverId);
    if (!cover) return;
    const from = String(row["fromDate"] ?? "");
    const to = String(row["toDate"] ?? "");
    const locationId = String(row["locationId"] ?? cover["locationId"] ?? "");
    const open = (allRows["appointments"] ?? []).filter((a) => {
      const date = String(a["date"] ?? "").slice(0, 10);
      if (String(a["staffId"]) !== String(row["staffId"])) return false;
      if (locationId && String(a["locationId"]) !== locationId) return false;
      if (date < from || date > to) return false;
      return !["Completed", "Cancelled", "No-show"].includes(String(a["status"] ?? ""));
    });
    for (const appt of open) {
      update("appointments", String(appt.id), {
        ...appt,
        staffId: cover.id,
        staff: String(cover["name"]),
        locationId: cover["locationId"] ?? appt["locationId"],
      });
    }
  }
  return (
    <CrudPage
      module={{
        ...leavesModule,
        subtitle: isStylist ? "Request and track your own leave only." : leavesModule.subtitle,
      }}
      displayValue={(field, row) => {
        if (field.name === "staffId") return staffName(staff, row["staffId"]);
        if (field.name === "coverStaffId") return Number(row["coverStaffId"]) ? staffName(staff, row["coverStaffId"]) : "—";
        return undefined;
      }}
      selectOptions={(field, row) => {
        if (field.name === "staffId") return options;
        if (field.name === "coverStaffId") return [{ value: "0", label: "No cover" }, ...coverFor(row ?? {})];
        return undefined;
      }}
      lockedFields={isStylist ? ["staffId"] : []}
      prepareNew={(row) => (isStylist && me ? { ...row, staffId: String(me.id) } : row)}
      validate={(row) => {
        if (!row["staffId"]) return "Pick a staff member";
        if (!row["fromDate"] || !row["toDate"]) return "Set from and to dates";
        if (String(row["toDate"]) < String(row["fromDate"])) return "To date must be on or after from date";
        return null;
      }}
      prepareSave={(row) => {
        const next = placeFromStaff(isStylist && me ? { ...row, staffId: String(me.id) } : row, staff);
        return {
          ...next,
          coverStaffId: Number(next["coverStaffId"] ?? 0) || 0,
          days: leaveDays(String(next["fromDate"] ?? ""), String(next["toDate"] ?? "")),
        };
      }}
      onSaved={(row) => handAppointmentsToCover(row)}
    />
  );
}
