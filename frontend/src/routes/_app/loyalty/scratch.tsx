import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/loyalty/scratch")({
  beforeLoad: () => {
    throw redirect({ to: "/scratch-card" });
  },
});
