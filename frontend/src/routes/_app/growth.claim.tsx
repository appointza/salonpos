import { createFileRoute } from "@tanstack/react-router";
import { GrowthClaimPage } from "@/pages/Growth/GrowthClaim";

const title = "Claim points — Krios";
const description = "Look up a guest by mobile, see offers at this store, and claim points onto their POS balance.";

export const Route = createFileRoute("/_app/growth/claim")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: GrowthClaimPage,
});
