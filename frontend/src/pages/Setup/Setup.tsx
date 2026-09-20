import { Link } from "@tanstack/react-router";
import { ArrowRight, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SETUP_STEPS } from "@/lib/onboarding";
import { useTenant } from "@/lib/tenant";

export function Page() {
  const { org } = useTenant();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Admin Overview</p>
        <h1 className="font-display text-2xl font-semibold">Easy setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Finish these screens for <strong>{org.name}</strong> — you can skip and return anytime.
        </p>
      </div>

      <div className="grid gap-4">
        {SETUP_STEPS.map((step, index) => (
          <Link
            key={step.key}
            to={step.to}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <Button asChild variant="outline">
        <Link to="/dashboard">
          <ListChecks className="size-4" /> Back to dashboard
        </Link>
      </Button>
    </div>
  );
}
