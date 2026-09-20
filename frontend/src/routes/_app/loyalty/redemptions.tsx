import { createFileRoute } from "@tanstack/react-router";
import { RedemptionsPage } from "@/pages/LoyaltyRedemptions/LoyaltyRedemptions";


export const Route = createFileRoute("/_app/loyalty/redemptions")({
  component: RedemptionsPage,
});
