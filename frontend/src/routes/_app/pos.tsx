import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Pos/Pos";

const title = "POS & Billing — Luxe Salon CRM";
const description = "Search customers by phone, bill services and products, and send receipts on WhatsApp.";

export const Route = createFileRoute("/_app/pos")({
  validateSearch: (search: Record<string, unknown>) => ({
    appointment: typeof search.appointment === "string" && search.appointment ? search.appointment : undefined,
  }),
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
