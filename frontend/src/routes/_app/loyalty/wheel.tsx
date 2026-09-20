import { createFileRoute } from "@tanstack/react-router";
import { WheelPage } from "@/pages/LoyaltyWheel/LoyaltyWheel";


export const Route = createFileRoute("/_app/loyalty/wheel")({
  component: WheelPage,
});
