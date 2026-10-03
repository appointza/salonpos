import { createFileRoute } from "@tanstack/react-router";
import { NearbyBookingPage } from "@/pages/Nearby/NearbyBooking";

const title = "Book appointment — Luxe Salon";
const description = "Pick a salon, service and time slot for your next visit.";

export const Route = createFileRoute("/nearby/booking")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: NearbyBookingPage,
});
