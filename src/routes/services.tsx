import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

const title = "Service Catalogue — Luxe Salon CRM";
const description = "Maintain the salon service catalogue with pricing, GST slabs and commissions.";

export const Route = createFileRoute("/services")({
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

function Page() {
  return <CrudPage module={modules.services} />;
}
