import { createFileRoute } from "@tanstack/react-router";
import { CheckinsPage } from "@/pages/LoyaltyCheckins/LoyaltyCheckins";


export const Route = createFileRoute("/_app/loyalty/checkins")({
  component: CheckinsPage,
});
