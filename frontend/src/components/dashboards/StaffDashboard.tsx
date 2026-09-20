import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  IndianRupee,
  Package,
  Receipt,
  Star,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashHeader, DashStat, QuickLink, sortAppointments } from "@/components/dashboards/shared";
import { listLowStockAlerts } from "@/lib/business/inventory-service";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export function StaffDashboard() {
  const { db } = useData();
  const { user } = useAuth();
  const { org, location, locationId, scopeLabel } = useTenant();
  const appointments = sortAppointments(db["appointments"] ?? []);
  const open = appointments.filter((a) => a["status"] === "Confirmed" || a["status"] === "Pending");
  const invoices = db["invoices"] ?? [];
  const paid = invoices.filter((i) => i["status"] === "Paid");
  const revenue = paid.reduce((sum, i) => sum + Number(i["total"] ?? 0), 0);
  const lowStock = listLowStockAlerts(
    db,
    org.orgId,
    location?.locationId ?? (locationId === "all" ? undefined : locationId),
  );

  return (
    <div className="space-y-8">
      <DashHeader
        kicker="Front desk"
        title={`Hello${user ? `, ${user.name}` : ""}`}
        subtitle={
          <>
            Check in guests, take payments and keep this outlet’s book. {org.name} · {scopeLabel}
            {location ? ` · ${location.city}` : ""}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashStat icon={CalendarDays} label="Open bookings" value={String(open.length)} hint="Pending + confirmed on this floor" />
        <DashStat icon={Users} label="Customers" value={String((db["customers"] ?? []).length)} hint="Profiles you can bill" />
        <DashStat icon={IndianRupee} label="Collected" value={`₹${revenue.toLocaleString("en-IN")}`} hint="Paid invoices in view" />
        <DashStat icon={Package} label="Low stock" value={String(lowStock.length)} hint="At or below reorder" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/loyalty" icon={Star} color="bg-violet-100 text-violet-700" title="Loyalty & QR" text="Programs, wheel prizes, and outlet codes." />
        <QuickLink to={`/${org.slug}/walk-in`} icon={Users} color="bg-violet-100 text-violet-700" title="Walk-in (public)" text="Guest check-in — wheel or scratch, no login." />
        <QuickLink to="/pos" icon={Receipt} color="bg-orange-100 text-orange-600" title="Open POS" text="Bill a walk-in or a booked client." />
        <QuickLink to="/appointments" icon={CalendarDays} color="bg-blue-100 text-blue-600" title="Bookings" text="Create, confirm or reschedule." />
        <QuickLink to="/customers" icon={Users} color="bg-emerald-100 text-emerald-700" title="Customers" text="Look up membership and loyalty." />
        <QuickLink to="/inventory" icon={Package} color="bg-muted text-muted-foreground" title="Stock" text="Check remaining product on hand." />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Floor diary</h2>
            <Badge variant="secondary">{open.length} open</Badge>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {appointments.length === 0 && <li className="py-6 text-sm text-muted-foreground">No appointments in this location.</li>}
            {appointments.slice(0, 10).map((a) => (
              <li key={String(a.id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {String(a["time"])} · {String(a["customer"])}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {String(a["service"])} · {String(a["staff"])} · {String(a["date"])}
                  </p>
                </div>
                <Badge variant="secondary">{String(a["status"])}</Badge>
              </li>
            ))}
          </ul>
          <Link to="/appointments" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            All appointments <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Low stock</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {lowStock.length === 0 && <li className="text-muted-foreground">All items above reorder.</li>}
              {lowStock.slice(0, 6).map((i) => (
                <li key={i.skuId} className="flex items-center justify-between gap-3">
                  <span className="truncate">{i.name}</span>
                  <Badge variant={i.expired ? "destructive" : "secondary"}>{i.remaining}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Star className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Latest feedback</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {(db["feedback"] ?? []).slice(0, 4).map((f) => (
                <li key={String(f.id)}>
                  <span className="font-medium">{String(f["customer"])}</span>
                  <span className="text-muted-foreground"> · {String(f["rating"])}/5</span>
                </li>
              ))}
            </ul>
            <Link to="/feedback" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Recovery queue <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
