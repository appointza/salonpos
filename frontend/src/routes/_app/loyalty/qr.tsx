import { createFileRoute } from "@tanstack/react-router";
import { OutletQrPage } from "@/pages/LoyaltyQr/LoyaltyQr";


export const Route = createFileRoute("/_app/loyalty/qr")({
  component: OutletQrPage,
});
