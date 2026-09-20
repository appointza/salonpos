import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/pages/Appointments/Appointments";

const title = "Appointments — Luxe Salon CRM";
const description = "Create, reschedule and track salon bookings across outlets and stylists.";

export const Route = createFileRoute("/_app/appointments")({
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
