import { Outlet } from "@tanstack/react-router";

/** Child routes (QR, partners, ledger) render Growth tabs themselves. */
export function LoyaltyLayout() {
  return <Outlet />;
}
