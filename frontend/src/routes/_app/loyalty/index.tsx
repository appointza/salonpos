import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/loyalty/")({
  component: () => <Navigate to="/loyalty/qr" replace />,
});
