import { createFileRoute } from "@tanstack/react-router";
import { NearbyPage } from "@/pages/Nearby/Nearby";

const title = "Salons near you — Book instantly";
const description = "Find salon studios near your location, compare services and stylists, and book an appointment directly.";

export const Route = createFileRoute("/nearby")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: NearbyPage,
});
