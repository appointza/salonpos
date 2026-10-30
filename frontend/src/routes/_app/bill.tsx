import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/bill")({
  beforeLoad: () => {
    throw redirect({ to: "/settings", search: { tab: "bill" } });
  },
});
