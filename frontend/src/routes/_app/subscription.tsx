import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Subscription/Subscription";

const title = "Subscription Plans — Luxe Salon CRM";
const description = "Compare plans, limits and billing cycles for your salon organisation.";

export const Route = createFileRoute("/_app/subscription")({
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
