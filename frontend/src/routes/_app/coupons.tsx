import { createFileRoute } from "@tanstack/react-router";
import { CouponsLayout } from "@/pages/Coupons/Coupons";

const title = "Coupon management — Krios";
const description = "Create coupon schemes, generate code pools, and track redemptions at POS.";

export const Route = createFileRoute("/_app/coupons")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CouponsLayout,
});
