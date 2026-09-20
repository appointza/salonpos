import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/BrandApps/BrandApps";

const title = "White-Label Apps — Luxe Salon CRM";
const description = "Publish white-label branded apps and websites for each salon outlet.";

export const Route = createFileRoute("/_app/brand-apps")({
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
