import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Commissions/Commissions";

const title = "Commission Ledger — Luxe Salon CRM";
const description = "Commissions are generated from POS invoices, not typed independently.";

export const Route = createFileRoute("/_app/commissions")({
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
