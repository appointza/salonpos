import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Memberships/Memberships";

const title = "Memberships — Luxe Salon CRM";
const description = "Define reusable membership plans and enroll any number of customers on each plan.";

export const Route = createFileRoute("/_app/memberships")({
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
