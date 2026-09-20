import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Leaves/Leaves";

const title = "Leave Requests — Luxe Salon CRM";
const description = "Approved leave is the source of Leave days on Attendance. Days are counted from the date range.";

export const Route = createFileRoute("/_app/leaves")({
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
