import { createFileRoute } from "@tanstack/react-router";
import { CustomerNearbyLayout } from "@/layouts/CustomerNearbyLayout";

export const Route = createFileRoute("/nearby")({
  component: CustomerNearbyLayout,
});
