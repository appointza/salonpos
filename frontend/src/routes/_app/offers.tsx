import { createFileRoute } from "@tanstack/react-router";
import { OffersPage } from "@/pages/Offers/Offers";

const title = "QR Offers — Luxe Salon CRM";
const description = "Birthday, welcome and tier offers shown after customer check-in.";

export const Route = createFileRoute("/_app/offers")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: OffersPage,
});
