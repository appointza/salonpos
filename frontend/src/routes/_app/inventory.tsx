import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Inventory/Inventory";

const title = "Inventory — Luxe Salon CRM";
const description = "Remaining stock is Opening + Purchases − Sales − Used. Movements are the audit trail.";

export const Route = createFileRoute("/_app/inventory")({
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
