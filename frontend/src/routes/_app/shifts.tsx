import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Shifts/Shifts";

const title = "Shifts & Roster — Luxe Salon CRM";
const description = "Plan expected working hours per staff member. Attendance is compared against these shifts.";

export const Route = createFileRoute("/_app/shifts")({
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
