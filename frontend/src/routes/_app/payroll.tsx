import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Payroll/Payroll";

const title = "Payroll — Luxe Salon CRM";
const description = "Net pay from staff salary, attendance/leave and the commission ledger.";

export const Route = createFileRoute("/_app/payroll")({
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
