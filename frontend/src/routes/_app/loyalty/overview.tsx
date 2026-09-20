import { createFileRoute } from "@tanstack/react-router";
import { LoyaltyOverviewPage } from "@/pages/LoyaltyOverview/LoyaltyOverview";


export const Route = createFileRoute("/_app/loyalty/overview")({
  component: LoyaltyOverviewPage,
});
