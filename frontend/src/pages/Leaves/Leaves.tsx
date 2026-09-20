import { CrudPage } from "@/components/CrudPage";
import { useAuth } from "@/lib/auth";
import { modules } from "@/lib/modules";
import { leaveDays, staffName } from "@/lib/hr";
import { resolveStaffForUser } from "@/lib/staff-scope";
import { useCollection, useData } from "@/lib/store";

const title = "Leave Requests — Luxe Salon CRM";
const description = "Approved leave is the source of Leave days on Attendance. Days are counted from the date range.";

export function Page() {
  const { user } = useAuth();
  const { allRows, orgId } = useData();
  const { rows: staff } = useCollection("staff");
  const isStylist = user?.role === "STYLIST";
  const me = resolveStaffForUser(
    (allRows["staff"] ?? []).filter((s) => String(s["orgId"]) === orgId),
    user,
  );
  const options = staff.map((s) => ({ value: String(s.id), label: `${String(s["name"])} · ${String(s.id)}` }));
  return (
    <CrudPage
      module={{
        ...modules.leaves,
        subtitle: isStylist ? "Request and track your own leave only." : modules.leaves.subtitle,
      }}
      displayValue={(field, row) => (field.name === "staffId" ? staffName(staff, row["staffId"]) : undefined)}
      selectOptions={(field) => (field.name === "staffId" ? options : undefined)}
      lockedFields={isStylist ? ["staffId"] : []}
      prepareNew={(row) => (isStylist && me ? { ...row, staffId: String(me.id) } : row)}
      validate={(row) => {
        if (!row["staffId"]) return "Pick a staff member";
        if (!row["fromDate"] || !row["toDate"]) return "Set from and to dates";
        if (String(row["toDate"]) < String(row["fromDate"])) return "To date must be on or after from date";
        return null;
      }}
      prepareSave={(row) => ({
        ...(isStylist && me ? { ...row, staffId: String(me.id) } : row),
        days: leaveDays(String(row["fromDate"] ?? ""), String(row["toDate"] ?? "")),
      })}
    />
  );
}
