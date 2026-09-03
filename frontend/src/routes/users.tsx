import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { UsersRolesSubnav } from "@/components/UsersRolesSubnav";
import { modules } from "@/lib/modules";
import { permissionSummary } from "@/lib/permissions";
import { useCollection } from "@/lib/store";

const title = "Users & Roles — Luxe Salon CRM";
const description = "Assign workspace users to roles defined under Roles & permissions.";

export const Route = createFileRoute("/users")({
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
  const { rows: roles } = useCollection("roles");
  const options = roles.map((r) => ({ value: String(r["name"]), label: `${String(r["name"])} · ${String(r["code"])}` }));

  return (
    <div className="space-y-6">
      <UsersRolesSubnav />
      <CrudPage
        module={{
          ...modules.users,
          subtitle: "People who can sign in. Permissions come from the role, not a free-text field.",
        }}
        selectOptions={(field) => (field.name === "role" ? options : undefined)}
        displayValue={(field, row) => {
          if (field.name !== "permissions") return undefined;
          const role = roles.find((r) => String(r["name"]) === String(row["role"] ?? ""));
          return role ? permissionSummary(role) : String(row["permissions"] ?? "—");
        }}
        prepareSave={(row) => {
          const role = roles.find((r) => String(r["name"]) === String(row["role"] ?? ""));
          return { ...row, permissions: role ? permissionSummary(role) : String(row["permissions"] ?? "") };
        }}
      />
    </div>
  );
}
