import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

const title = "Commission Ledger — Luxe Salon CRM";
const description = "Audit per-transaction service and product commission entries.";

export const Route = createFileRoute("/commissions")({
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
  return <CrudPage module={modules.commissions} />;
}
