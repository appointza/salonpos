import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

const title = "Users & Roles — Luxe Salon CRM";
const description = "Control roles, outlet scope and permissions across the salon network.";

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
  return <CrudPage module={modules.users} />;
}
