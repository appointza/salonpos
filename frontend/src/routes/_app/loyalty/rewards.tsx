import { createFileRoute } from "@tanstack/react-router";
import { RewardsPage } from "@/pages/LoyaltyRewards/LoyaltyRewards";


export const Route = createFileRoute("/_app/loyalty/rewards")({
  component: RewardsPage,
});
