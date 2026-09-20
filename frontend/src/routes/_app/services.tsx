import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Services/Services";

const title = "Service Catalogue — Luxe Salon CRM";
const description = "Maintain the salon service catalogue with pricing, GST slabs, commissions and combo packages.";

export const Route = createFileRoute("/_app/services")({
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
