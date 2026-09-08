import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/loyalty/offers")({
  component: () => <Navigate to="/offers" replace />,
});
