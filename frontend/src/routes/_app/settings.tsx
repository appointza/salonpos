import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Settings/Settings";

const title = "Settings — Luxe Salon CRM";
const description = "Configure loyalty point conversion and the Meta WhatsApp Business API.";

export const Route = createFileRoute("/_app/settings")({
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
