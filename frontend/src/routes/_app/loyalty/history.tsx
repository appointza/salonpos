import { createFileRoute } from "@tanstack/react-router";
import { LoyaltyHistoryPage } from "@/pages/LoyaltyHistory/LoyaltyHistory";


export const Route = createFileRoute("/_app/loyalty/history")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : "points",
  }),
  component: LoyaltyHistoryPage,
});
