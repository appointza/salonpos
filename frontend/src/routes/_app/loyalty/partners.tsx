import { createFileRoute } from "@tanstack/react-router";
import { PartnersPage } from "@/pages/LoyaltyPartners/LoyaltyPartners";


export const Route = createFileRoute("/_app/loyalty/partners")({
  component: PartnersPage,
});
