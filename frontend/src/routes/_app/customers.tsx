import { createFileRoute } from "@tanstack/react-router";
import { CustomersLayout } from "@/pages/Customers/Customers";

const title = "Customers — Luxe Salon CRM";
const description = "Manage salon customer profiles, households, loyalty tiers and wallet balances.";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CustomersLayout,
});
