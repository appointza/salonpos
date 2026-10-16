import { createFileRoute } from "@tanstack/react-router";
import { CustomerOffersPage } from "@/pages/NearbyOffers/CustomerOffers";

const title = "Offers by salon — Krios";
const description = "See which salon location has which offers, and how many days your coupons stay valid.";

export const Route = createFileRoute("/nearby/offers")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CustomerOffersPage,
});
