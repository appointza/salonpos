import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Row } from "@/lib/store";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function PlanInfoButton({ plan, enrollment }: { plan: Row | null; enrollment?: Row | null }) {
  if (!plan) return null;
  const limit = Number(plan["includedLimit"] ?? 0);
  const extra = Number(plan["extraDiscountPct"] ?? 0);
  const retail = Number(plan["retailDiscountPct"] ?? 0);
  const name = String(plan["name"] ?? "Plan");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`${name} details`}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-3 text-sm">
        <p className="font-medium leading-tight">{name}</p>
        <p className="text-muted-foreground">
          {money(Number(plan["price"] ?? 0))} · {String(plan["validityMonths"] ?? "—")} months
        </p>
        {String(plan["benefits"] ?? "") ? <p>{String(plan["benefits"])}</p> : null}
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            {limit <= 0 ? "Unlimited included visits" : `${limit} included visits`}
            {String(plan["includedMatch"] ?? "") ? ` · ${String(plan["includedMatch"])}` : ""}
          </li>
          {extra > 0 ? (
            <li>
              {extra}% extra off {String(plan["extraDiscountMatch"] ?? "matching services")}
            </li>
          ) : null}
          {retail > 0 ? <li>{retail}% off retail products</li> : null}
          {enrollment ? (
            <li>
              Enrollment {String(enrollment.id)} · {String(enrollment["status"] ?? "")}
              {enrollment["startDate"] ? ` · ${String(enrollment["startDate"])}` : ""}
              {enrollment["endDate"] ? ` – ${String(enrollment["endDate"])}` : ""}
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
