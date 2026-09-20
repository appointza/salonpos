import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Staff/Staff";

const title = "Staff — Luxe Salon CRM";
const description = "Maintain staff records with salary, commission rates and monthly targets.";

export const Route = createFileRoute("/_app/staff")({
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
