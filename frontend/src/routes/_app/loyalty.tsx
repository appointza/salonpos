import { createFileRoute } from "@tanstack/react-router";
import { LoyaltyLayout } from "@/pages/Loyalty/Loyalty";

const title = "Loyalty — Luxe Salon CRM";
const description = "Program rules drive POS earn/redeem. The ledger is written only at checkout.";

export const Route = createFileRoute("/_app/loyalty")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LoyaltyLayout,
});
