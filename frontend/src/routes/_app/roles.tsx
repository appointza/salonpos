import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Roles/Roles";

const title = "Roles & permissions — Luxe Salon CRM";
const description = "Create roles and set view or edit access for each screen.";

export const Route = createFileRoute("/_app/roles")({
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
