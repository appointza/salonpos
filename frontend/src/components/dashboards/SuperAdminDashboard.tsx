import { Link } from "@tanstack/react-router";
import { Building2, CreditCard, IndianRupee, Shield, Users } from "lucide-react";
import { DashHeader, DashStat, QuickLink } from "@/components/dashboards/shared";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export function SuperAdminDashboard() {
  const { orgs, user } = useAuth();
  const { allRows } = useData();
  const { tenants } = useTenant();
  const locations = allRows["locations"] ?? [];
  const mrr = orgs.length * 2499;

  return (
    <div className="space-y-8">
      <DashHeader
        kicker="Platform console"
        title={`Welcome${user ? `, ${user.name}` : ""}`}
        subtitle="Every organisation on the network. Open the platform page for billing and isolation by orgId."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashStat icon={Building2} label="Organisations" value={String(orgs.length || tenants.length)} hint="Isolated workspaces" />
        <DashStat icon={Users} label="Locations" value={String(locations.length)} hint="Outlets across the network" />
        <DashStat icon={CreditCard} label="Subscriptions" value={String(orgs.filter((o) => o.completed.includes("subscription")).length)} hint="Marked complete in setup" />
        <DashStat icon={IndianRupee} label="Platform MRR" value={`₹${mrr.toLocaleString("en-IN")}`} hint="Demo: ₹2,499 per org" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink to="/platform" icon={Shield} color="bg-blue-100 text-blue-600" title="Platform home" text="Org list, plans and operators." />
        <QuickLink to="/franchises" icon={Building2} color="bg-orange-100 text-orange-600" title="Franchises" text="Network of branded outlets." />
        <QuickLink to="/users" icon={Users} color="bg-emerald-100 text-emerald-700" title="Users & roles" text="Who can access each workspace." />
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Organisations</h2>
        <ul className="mt-4 divide-y divide-border">
          {(orgs.length ? orgs : tenants).map((o) => (
            <li key={o.orgId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium">{o.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{o.orgId}</p>
              </div>
              <Link to="/platform" className="text-xs text-primary hover:underline">
                Manage
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
