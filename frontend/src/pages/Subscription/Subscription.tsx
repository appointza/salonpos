import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/tenant";

const title = "Subscription Plans — Luxe Salon CRM";
const description = "Compare plans, limits and billing cycles for your salon organisation.";

const PLANS = [
  {
    name: "Starter",
    monthly: 1499,
    yearly: 14990,
    limits: "1 outlet · 5 staff · 1,000 customers",
    features: ["POS & billing", "Appointments", "Customer records", "Basic reports", "WhatsApp receipts"],
  },
  {
    name: "Growth",
    monthly: 3999,
    yearly: 39990,
    popular: true,
    limits: "3 outlets · 25 staff · 10,000 customers",
    features: [
      "Everything in Starter",
      "Inventory & expenses",
      "Loyalty & memberships",
      "WhatsApp campaigns",
      "Staff commissions & payroll",
    ],
  },
  {
    name: "Enterprise",
    monthly: 8999,
    yearly: 89990,
    limits: "Unlimited outlets, staff & customers",
    features: [
      "Everything in Growth",
      "Franchise network console",
      "White-label app & website",
      "Custom roles & audit history",
      "Priority support",
    ],
  },
];

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function Page() {
  const { org } = useTenant();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [current, setCurrent] = useState("Growth");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Subscription plans</h1>
          <p className="text-sm text-muted-foreground">
            {org.name} is currently on the <span className="font-medium text-foreground">{current}</span> plan.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${cycle === c ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const active = current === p.name;
          return (
            <section
              key={p.name}
              className={`flex flex-col rounded-xl border bg-card p-5 shadow-sm ${active ? "border-primary ring-1 ring-primary/30" : "border-border"}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg">{p.name}</h2>
                {p.popular && (
                  <Badge>
                    <Sparkles className="size-3" /> Popular
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-3xl font-semibold">
                {money(cycle === "monthly" ? p.monthly : p.yearly)}
                <span className="text-sm font-normal text-muted-foreground">
                  /{cycle === "monthly" ? "mo" : "yr"}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{p.limits}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5 w-full"
                variant={active ? "outline" : "default"}
                disabled={active}
                onClick={() => {
                  setCurrent(p.name);
                  toast.success(`Switched to ${p.name}`, { description: `Billed ${cycle} · ${org.name}` });
                }}
              >
                {active ? "Current plan" : `Choose ${p.name}`}
              </Button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
