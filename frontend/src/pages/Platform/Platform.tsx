import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, CreditCard, IndianRupee, LogOut, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

const title = "Platform console — Luxe Salon CRM";
const description = "SUPER_ADMIN console: all organizations, admins, subscription plans, payments and platform analytics.";

export function PlatformPage() {
  const { orgs, user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="font-display text-base leading-none">Platform console</p>
              <p className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Super admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card icon={Building2} label="Organizations" value={String(orgs.length)} />
          <Card icon={Users} label="Org admins" value={String(orgs.length)} />
          <Card icon={CreditCard} label="Active subscriptions" value={String(orgs.filter((o) => o.completed.includes("subscription")).length)} />
          <Card icon={IndianRupee} label="Platform MRR" value={`₹${(orgs.length * 2499).toLocaleString("en-IN")}`} />
        </div>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">All organizations</h2>
            <p className="text-xs text-muted-foreground">Each organization is isolated by its orgId UUID.</p>
          </div>
          {orgs.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No organizations yet.{" "}
              <Link to="/register" className="text-primary hover:underline">
                Register one
              </Link>{" "}
              to see it here.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {orgs.map((o) => (
                <li key={o.orgId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-medium">{o.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{o.orgId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.businessType} · {o.services.length} services · {o.staff.length} staff · {o.outletCount} outlets
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{o.plan}</Badge>
                    <Badge>{o.completed.includes("subscription") ? "Paid" : "Trial"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Panel title="Subscription plans" items={["Starter — ₹999/mo", "Growth — ₹2,499/mo", "Enterprise — ₹5,999/mo"]} />
          <Panel title="Audit log" items={orgs.slice(0, 5).map((o) => `Organization created · ${o.name} · ${new Date(o.createdAt).toLocaleString()}`)} empty="No platform events yet." />
        </section>
      </main>
    </div>
  );
}

function Card({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="font-display mt-3 text-3xl tracking-tight">{value}</p>
    </div>
  );
}

function Panel({ title: t, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">{t}</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.length === 0 && <li>{empty ?? "Nothing here yet."}</li>}
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
