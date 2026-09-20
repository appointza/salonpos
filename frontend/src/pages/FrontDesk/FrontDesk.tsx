import { Link } from "@tanstack/react-router";
import { CalendarDays, Receipt, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/brand";
import { useTenant } from "@/lib/tenant";

export function Page() {
  const { org } = useTenant();
  const walkInUrl = `/${org.slug}/walk-in`;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Admin Overview</p>
        <h1 className="font-display text-2xl font-semibold">Front desk</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick links for reception at <strong>{org.name}</strong>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/customers"
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <Users className="size-5 text-primary" />
          <p className="mt-3 font-medium">Customers</p>
          <p className="mt-1 text-sm text-muted-foreground">Search profiles, loyalty and membership.</p>
        </Link>

        <Link
          to="/appointments"
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <CalendarDays className="size-5 text-primary" />
          <p className="mt-3 font-medium">Appointments</p>
          <p className="mt-1 text-sm text-muted-foreground">Today&apos;s bookings and check-ins.</p>
        </Link>

        <Link
          to="/pos"
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <Receipt className="size-5 text-primary" />
          <p className="mt-3 font-medium">POS & Billing</p>
          <p className="mt-1 text-sm text-muted-foreground">Bill services and products.</p>
        </Link>

        <a
          href={walkInUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <UserRound className="size-5 text-primary" />
          <p className="mt-3 font-medium">Walk-in (public)</p>
          <p className="mt-1 text-sm text-muted-foreground">Open guest check-in kiosk in a new tab.</p>
        </a>
      </div>

      <Button asChild variant="outline">
        <a href={walkInUrl} target="_blank" rel="noreferrer">Open walk-in kiosk</a>
      </Button>
    </div>
  );
}
