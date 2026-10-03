import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SETUP_STEPS } from "@/pages/Setup/onboarding";
import { useData, type Row } from "@/store";
import { useTenant } from "@/tenant";

function forOrg(rows: Row[] | undefined, orgId: number) {
  return (rows ?? []).filter((row) => String(row["orgId"]) === String(orgId));
}

export function Page() {
  const { org, orgId } = useTenant();
  const { allRows } = useData();
  const done: Record<string, boolean> = {
    services: forOrg(allRows.services, orgId).length > 0,
    staff: forOrg(allRows.staff, orgId).length > 0,
    shifts: forOrg(allRows.shifts, orgId).length > 0,
    inventory: forOrg(allRows.vendors, orgId).length > 0 || forOrg(allRows.inventory, orgId).length > 0,
    loyalty:
      forOrg(allRows.memberships, orgId).length > 0 ||
      forOrg(allRows.wheelSegments, orgId).length > 0 ||
      forOrg(allRows.scratchPrizes, orgId).length > 0,
    booking: Boolean(org.slug),
  };
  const finished = SETUP_STEPS.filter((step) => done[step.key]).length;
  const complete = finished === SETUP_STEPS.length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Admin Overview</p>
        <h1 className="font-display text-2xl font-semibold">Easy setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {finished} of {SETUP_STEPS.length} complete for <strong>{org.name}</strong>.
        </p>
      </div>

      {complete ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <CheckCircle2 className="size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Setup complete</p>
            <p className="text-sm text-muted-foreground">Every step for this salon is in place. You can still open a step to change it.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4">
        {SETUP_STEPS.map((step, index) => {
          const ready = Boolean(done[step.key]);
          return (
            <Link
              key={step.key}
              to={step.to}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              {ready ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CheckCircle2 className="size-5" />
                </span>
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {index + 1}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {step.title}
                  {ready ? <span className="ml-2 text-xs font-medium text-primary">Done</span> : null}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>

      <Button asChild variant="outline">
        <Link to="/dashboard">
          <ListChecks className="size-4" /> Back to dashboard
        </Link>
      </Button>
    </div>
  );
}
