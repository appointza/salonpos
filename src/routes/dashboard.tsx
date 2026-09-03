import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, IndianRupee, Users, Star, TriangleAlert, RotateCcw, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/store";
import { useAuth, generateSlots } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

const title = "Dashboard — Luxe Salon CRM";
const description = "Owner dashboard for the salon network: revenue, bookings, stock alerts and setup checklist.";

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

const CHECKLIST = [
  { key: "services", label: "Add your services", to: "/services" },
  { key: "staff", label: "Configure staff schedules", to: "/staff" },
  { key: "qr", label: "Create your first QR code", to: "/campaigns" },
  { key: "menu", label: "Import your digital menu", to: "/services" },
  { key: "loyalty", label: "Set up loyalty program", to: "/loyalty" },
  { key: "rewards", label: "Create a reward", to: "/memberships" },
  { key: "whatsapp", label: "Integrate WhatsApp ordering", to: "/campaigns" },
] as const;

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="font-display mt-3 text-3xl tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Dashboard() {
  const { db, reset } = useData();
  const { org, user, toggleChecklist } = useAuth();
  const { org: tenant, location, scopeLabel } = useTenant();
  const invoices = db["invoices"] ?? [];
  const revenue = invoices
    .filter((i) => i["status"] === "Paid")
    .reduce((sum, i) => sum + Number(i["total"] ?? 0), 0);
  const upcoming = (db["appointments"] ?? []).filter((a) => a["status"] === "Confirmed" || a["status"] === "Pending");
  const lowStock = (db["inventory"] ?? []).filter((i) => Number(i["stock"]) <= Number(i["reorderLevel"]));
  const ratings = db["feedback"] ?? [];
  const avgRating = ratings.length
    ? (ratings.reduce((s, f) => s + Number(f["rating"] ?? 0), 0) / ratings.length).toFixed(1)
    : "—";

  const byOutlet = Object.values(
    invoices.reduce<Record<string, { outlet: string; revenue: number }>>((acc, inv) => {
      const key = String(inv["outlet"]);
      acc[key] = { outlet: key, revenue: (acc[key]?.revenue ?? 0) + Number(inv["total"] ?? 0) };
      return acc;
    }, {}),
  );

  const slots = org ? generateSlots(org.hours, Number(org.slots.duration), Number(org.slots.buffer)) : [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            {user ? `${user.role} console` : "Owner console"}
          </p>
          <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight">
            Welcome back{user ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {tenant.name} · {scopeLabel}
            {tenant.domain ? ` · ${tenant.domain}` : ""}
            {location ? ` · ${location.city}` : ""}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            orgId {tenant.orgId} / locationId {location?.locationId ?? "all"}
          </p>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {org ? (
              <>
                orgId <code className="font-mono text-xs">{org.orgId}</code> · every record below is scoped to this
                organization.
              </>
            ) : (
              "A demo dataset powers every screen. Create, edit and delete records anywhere — changes persist in this browser only."
            )}
          </p>
          <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground">Public booking link</span>
            <a
              href={`/${tenant.slug}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-primary hover:underline"
            >
              {typeof window !== "undefined" ? window.location.origin : ""}/{tenant.slug}
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/${tenant.slug}`);
                toast.success("Booking link copied — share it with customers");
              }}
            >
              Copy link
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            reset();
            toast.success("Demo data restored");
          }}
        >
          <RotateCcw /> Reset demo data
        </Button>
      </header>

      {org && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Finish your setup</h2>
              <p className="text-xs text-muted-foreground">
                {org.completed.length} of {CHECKLIST.length + 3} setup items complete
              </p>
            </div>
            <Badge variant="secondary">
              {org.plan} plan · {org.slots.duration} min slots · {slots.length} slots/day
            </Badge>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {CHECKLIST.map((c) => {
              const done = org.completed.includes(c.key);
              return (
                <li key={c.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <button type="button" className="flex items-center gap-2 text-left" onClick={() => toggleChecklist(c.key)}>
                    {done ? <CheckCircle2 className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}
                    <span className={done ? "text-muted-foreground line-through" : ""}>{c.label}</span>
                  </button>
                  <Link to={c.to} className="text-xs text-primary hover:underline">
                    Open
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={IndianRupee} label="Collected revenue" value={`₹${revenue.toLocaleString("en-IN")}`} hint="Paid invoices in dataset" />
        <Stat icon={CalendarDays} label="Open bookings" value={String(upcoming.length)} hint="Pending + confirmed" />
        <Stat icon={Users} label="Customers" value={String((db["customers"] ?? []).length)} hint="Across all outlets" />
        <Stat icon={Star} label="Avg. rating" value={String(avgRating)} hint={`${ratings.length} feedback entries`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold tracking-wide">Revenue by outlet</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byOutlet}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="outlet" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-destructive" />
              <h2 className="text-sm font-semibold">Low stock</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {lowStock.length === 0 && <li className="text-muted-foreground">All items above reorder level.</li>}
              {lowStock.map((i) => (
                <li key={String(i.id)} className="flex items-center justify-between gap-3">
                  <span className="truncate">{String(i["name"])}</span>
                  <Badge variant="secondary">{String(i["stock"])} left</Badge>
                </li>
              ))}
            </ul>
            <Link to="/inventory" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Manage inventory <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Today's schedule</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {upcoming.slice(0, 4).map((a) => (
                <li key={String(a.id)} className="flex items-center justify-between gap-3">
                  <span className="truncate">
                    {String(a["time"])} · {String(a["customer"])}
                  </span>
                  <span className="text-xs text-muted-foreground">{String(a["staff"])}</span>
                </li>
              ))}
            </ul>
            <Link to="/appointments" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Open bookings <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
