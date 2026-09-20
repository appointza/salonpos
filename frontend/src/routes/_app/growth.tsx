import { createFileRoute } from "@tanstack/react-router";
import { GrowthGuidePage } from "@/pages/Growth/Growth";

const title = "Loyalty & coupons — Krios";
const description =
  "How reward points and promotional coupon codes work — separate instruments at POS, linked when points convert to vouchers.";

export const Route = createFileRoute("/_app/growth")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: GrowthGuidePage,
});
