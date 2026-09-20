import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Attendance/Attendance";

const title = "Attendance — Luxe Salon CRM";
const description = "Check-ins compared to published shifts. Approved leave fills Leave days automatically.";

export const Route = createFileRoute("/_app/attendance")({
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
