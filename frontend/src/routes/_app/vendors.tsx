import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Vendors/Vendors";

export const Route = createFileRoute("/_app/vendors")({
  head: () => ({
    meta: [{ title: "Vendors — Krios" }, { name: "description", content: "Manage product and service vendors." }],
  }),
  component: Page,
});
