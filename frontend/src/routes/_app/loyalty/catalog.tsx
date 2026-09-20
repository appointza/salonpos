import { createFileRoute } from "@tanstack/react-router";
import { RewardCatalogPage } from "@/pages/LoyaltyCatalog/LoyaltyCatalog";


export const Route = createFileRoute("/_app/loyalty/catalog")({
  component: RewardCatalogPage,
});
