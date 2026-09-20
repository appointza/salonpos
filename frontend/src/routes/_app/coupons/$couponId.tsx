import { createFileRoute } from "@tanstack/react-router";
import { CouponSchemeLayout } from "@/pages/CouponDetail/CouponDetail";


export const Route = createFileRoute("/_app/coupons/$couponId")({
  head: () => ({
    meta: [{ title: "Coupon scheme — Krios" }, { name: "description", content: "Coupon scheme overview and code pool summary." }],
  }),
  component: CouponSchemeLayout,
});
