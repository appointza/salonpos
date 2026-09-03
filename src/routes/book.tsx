import { createFileRoute } from "@tanstack/react-router";
import { PublicBooking } from "@/components/PublicBooking";

const title = "Book an appointment — Luxe Salon";
const description = "Browse salon services, prices and stylists, pick a location and book online in seconds.";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => <PublicBooking />,
});
