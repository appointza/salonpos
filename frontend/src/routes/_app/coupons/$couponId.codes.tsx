import { createFileRoute } from "@tanstack/react-router";
import { CouponCodesPage } from "@/pages/CouponCodes/CouponCodes";

const title = "Coupon codes — Krios";

export const Route = createFileRoute("/_app/coupons/$couponId/codes")({
  head: () => ({
    meta: [{ title }, { name: "description", content: "Individual coupon codes for a scheme." }],
  }),
  component: CouponCodesPage,
});
