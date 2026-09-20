import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Expenses/Expenses";

const title = "Expenses — Luxe Salon CRM";
const description = "Approved product purchases post a Purchase movement. Other categories never touch stock.";

export const Route = createFileRoute("/_app/expenses")({
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
