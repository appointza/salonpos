import { createFileRoute, redirect } from "@tanstack/react-router";
import { CustomerNearbyLayout } from "@/layouts/CustomerNearbyLayout";
import { readCustomerSession } from "@/session";

export const Route = createFileRoute("/nearby")({
  beforeLoad: () => {
    if (!readCustomerSession()) {
      throw redirect({ to: "/login" });
    }
  },
  component: CustomerNearbyLayout,
});
