import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { StaffDashboard } from "@/components/dashboards/StaffDashboard";
import { StylistDashboard } from "@/components/dashboards/StylistDashboard";
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard";
import { useAuth } from "@/lib/auth";

const title = "Dashboard — Luxe Salon CRM";
const description = "Role-specific workspace home: owner, front desk, stylist or platform.";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const role = user?.role ?? "ADMIN";
  if (role === "STYLIST") return <StylistDashboard />;
  if (role === "STAFF") return <StaffDashboard />;
  if (role === "SUPER_ADMIN") return <SuperAdminDashboard />;
  return <AdminDashboard />;
}
