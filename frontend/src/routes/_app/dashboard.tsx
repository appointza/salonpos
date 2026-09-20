import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/Dashboard/Dashboard";

const title = "Dashboard — Luxe Salon CRM";
const description = "Role-specific workspace home: owner, front desk, stylist or platform.";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Dashboard,
});
