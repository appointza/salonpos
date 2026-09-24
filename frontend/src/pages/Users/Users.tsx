import { CrudPage } from "@/components/CrudPage";
import { UsersRolesSubnav } from "@/components/UsersRolesSubnav";
import { modules } from "@/lib/modules";
import { roleByStoredValue, roleLabel } from "@/lib/default-roles";
import { permissionSummary } from "@/lib/permissions";
import { useCollection } from "@/lib/store";

const title = "Users & Roles — Luxe Salon CRM";
const description = "Assign workspace users to roles defined under Roles & permissions.";

export function Page() {
  const { rows: roles } = useCollection("roles");
  const { rows: outlets } = useCollection("franchises");
  const roleOptions = roles.map((r) => ({
    value: String(r["code"]),
    label: `${String(r["name"])} · ${String(r["code"])}`,
  }));
  const outletOptions = outlets.map((o) => ({
    value: String(o["name"]),
    label: String(o["name"]),
  }));

  return (
    <div className="space-y-6">
      <UsersRolesSubnav />
      <CrudPage
        module={{
          ...modules.users,
          subtitle: "People who can sign in. Assign each user to an outlet and role.",
        }}
        selectOptions={(field) => {
          if (field.name === "role") return roleOptions;
          if (field.name === "outlet") return outletOptions.length ? outletOptions : undefined;
          return undefined;
        }}
        displayValue={(field, row) => {
          if (field.name === "role") return roleLabel(roles, row["role"]);
          if (field.name !== "permissions") return undefined;
          const role = roleByStoredValue(roles, row["role"]);
          return role ? permissionSummary(role) : String(row["permissions"] ?? "—");
        }}
        prepareSave={(row) => {
          const role = roleByStoredValue(roles, row["role"]);
          return {
            ...row,
            role: role ? String(role["code"]) : String(row["role"] ?? ""),
            permissions: role ? permissionSummary(role) : String(row["permissions"] ?? ""),
          };
        }}
      />
    </div>
  );
}
