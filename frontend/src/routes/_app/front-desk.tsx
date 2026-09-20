import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/FrontDesk/FrontDesk";


export const Route = createFileRoute("/_app/front-desk")({
  head: () => ({
    meta: [
      { title: pageTitle("Front desk") },
      { name: "description", content: "Reception shortcuts for customers, appointments, billing and walk-in check-in." },
    ],
  }),
  component: Page,
});
