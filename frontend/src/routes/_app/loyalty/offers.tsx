import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/loyalty/offers")({
  component: () => <Navigate to="/offers" replace />,
});
