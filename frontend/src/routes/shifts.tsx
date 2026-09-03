import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { useAuth } from "@/lib/auth";
import { modules } from "@/lib/modules";
import { staffName } from "@/lib/hr";
import { resolveStaffForUser } from "@/lib/staff-scope";
import { useCollection, useData } from "@/lib/store";

const title = "Shifts & Roster — Luxe Salon CRM";
const description = "Plan expected working hours per staff member. Attendance is compared against these shifts.";

export const Route = createFileRoute("/shifts")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Page,
});

function Page() {
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
        ...modules.shifts,
        subtitle: isStylist ? "Your published shifts only." : modules.shifts.subtitle,
      }}
      displayValue={(field, row) => (field.name === "staffId" ? staffName(staff, row["staffId"]) : undefined)}
      selectOptions={(field) => (field.name === "staffId" ? options : undefined)}
      validate={(row) => (!row["staffId"] ? "Pick a staff member" : null)}
      prepareNew={(row) => (isStylist && me ? { ...row, staffId: String(me.id) } : row)}
      prepareSave={(row) => (isStylist && me ? { ...row, staffId: String(me.id) } : row)}
      lockedFields={isStylist ? ["staffId"] : []}
      canCreate={!isStylist}
      canDelete={!isStylist}
      canEdit={!isStylist}
      readOnly={isStylist}
    />
  );
}
