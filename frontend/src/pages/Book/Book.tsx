import { Navigate } from "@tanstack/react-router";
import { useTenant } from "@/lib/tenant";

const title = "Book or buy a membership — Luxe Salon";
const description = "Book an appointment or purchase a salon membership online.";

export function Page() {
  const { org } = useTenant();
  return <Navigate to="/$orgSlug" params={{ orgSlug: org.slug || "luxe-salon-group" }} replace />;
}
