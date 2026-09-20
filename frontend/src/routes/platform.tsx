import { createFileRoute } from "@tanstack/react-router";
import { PlatformPage } from "@/pages/Platform/Platform";

const title = "Platform console — Luxe Salon CRM";
const description = "SUPER_ADMIN console: all organizations, admins, subscription plans, payments and platform analytics.";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PlatformPage,
});
