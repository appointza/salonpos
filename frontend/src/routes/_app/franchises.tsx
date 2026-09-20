import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Franchises/Franchises";

const title = "Franchises — Luxe Salon CRM";
const description = "Oversee the outlet network with ownership, GSTIN and royalty terms.";

export const Route = createFileRoute("/_app/franchises")({
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
