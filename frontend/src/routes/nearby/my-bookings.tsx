import { createFileRoute } from "@tanstack/react-router";
import { NearbyBookingsPage } from "@/pages/Nearby/NearbyBookings";

const title = "My bookings — Luxe Salon";
const description = "View your salon appointments booked through the customer app.";

export const Route = createFileRoute("/nearby/my-bookings")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: NearbyBookingsPage,
});
