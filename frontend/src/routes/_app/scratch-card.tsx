import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/scratch-card")({
  beforeLoad: () => {
    throw redirect({ to: "/prize-wheel" });
  },
});
