import { Outlet, createFileRoute } from "@tanstack/react-router";

const title = "Loyalty & coupons — Krios";
const description =
  "How reward points and promotional coupon codes work — separate instruments at POS, linked when points convert to vouchers.";

function GrowthLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/_app/growth")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: GrowthLayout,
});
