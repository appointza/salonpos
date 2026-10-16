import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Invoices/Invoices";

const title = "Invoices — Luxe Salon CRM";
const description = "Review GST invoices, payments and refunds.";

export const Route = createFileRoute("/_app/invoices")({
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
