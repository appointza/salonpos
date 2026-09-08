import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/loyalty/")({
  component: () => <Navigate to="/loyalty/qr" replace />,
});
