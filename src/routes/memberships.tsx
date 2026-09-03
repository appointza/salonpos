import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

const title = "Memberships — Luxe Salon CRM";
const description = "Manage membership plans, enrollments, freezes and redemption usage.";

export const Route = createFileRoute("/memberships")({
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
  return <CrudPage module={modules.memberships} />;
}
