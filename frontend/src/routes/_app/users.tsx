import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Users/Users";

const title = "Users & Roles — Luxe Salon CRM";
const description = "Assign workspace users to roles defined under Roles & permissions.";

export const Route = createFileRoute("/_app/users")({
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
