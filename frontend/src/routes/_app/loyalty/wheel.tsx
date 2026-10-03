import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/loyalty/wheel")({
  beforeLoad: () => {
    throw redirect({ to: "/prize-wheel" });
  },
});
