import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Reports/Reports";


export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [{ title: "Reports — Krios" }, { name: "description", content: "Revenue reports by service, stylist and period." }],
  }),
  component: Page,
});
