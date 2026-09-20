import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Campaigns/Campaigns";

const title = "Marketing Campaigns — Luxe Salon CRM";
const description = "Build WhatsApp templates, target customer segments and track message delivery.";

export const Route = createFileRoute("/_app/campaigns")({
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
