import { CrudPage, type ModuleDef } from "@/components/CrudPage";
import { UsersRolesSubnav } from "@/components/UsersRolesSubnav";
import { roleByStoredValue, roleLabel } from "@/pages/Roles/default-roles";
import { permissionSummary } from "@/pages/Roles/permissions";
import { useCollection } from "@/store";

const title = "Users & Roles — Luxe Salon CRM";
const description = "Assign workspace users to roles defined under Roles & permissions.";

const usersModule: ModuleDef = {
  key: "users",
  title: "Users & Roles",
  subtitle: "Access control across HQ and outlets.",
  idPrefix: "U-",
  fields: [
    { name: "name", label: "Name", table: true },
    { name: "email", label: "Email", table: true },
    { name: "role", label: "Role", type: "select", options: ["Owner", "Outlet Manager", "Stylist", "Receptionist", "Admin"], table: true, badge: true },
    { name: "outlet", label: "Outlet", type: "select", options: ["All"], table: true },
    { name: "permissions", label: "Permissions", table: true, form: false },
    { name: "lastLogin", label: "Last login", table: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "Suspended"], table: true, badge: true },
  ],
};

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
          ...usersModule,
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
