import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CrudPage } from "@/components/CrudPage";
import { PlanInfoButton } from "@/components/PlanInfoButton";
import { modules } from "@/lib/modules";
import { useCollection, useData } from "@/lib/store";
import { customerName } from "@/lib/customers/customer-lookup";
import { planForEnrollment, includedVisitProgress } from "@/lib/membership";
import { useListView } from "@/lib/list-view";

const title = "Memberships — Luxe Salon CRM";
const description = "Define reusable membership plans and enroll any number of customers on each plan.";

const TABS = [
  { key: "plans", label: "Plans" },
  { key: "members", label: "Enrollments" },
  { key: "usage", label: "Usage" },
] as const;

export function Page() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("plans");
  const { allRows, orgId } = useData();
  const plans = (allRows["membershipPlans"] ?? []).filter((p) => String(p["orgId"]) === orgId);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Plans define benefits. Enrollments belong to a customer ID. Usage is written by POS — remaining visits are
        calculated from that history.
      </p>
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "plans" ? (
        <CrudPage module={modules.membershipPlans} />
      ) : tab === "members" ? (
        <CrudPage
          module={modules.memberships}
          displayValue={(field, row) => {
            if (field.name === "customerId") {
              const c = (allRows["customers"] ?? []).find((x) => String(x.id) === String(row["customerId"]));
              return c ? `${String(c["name"])} (${String(c.id)})` : String(row["customerId"] ?? "");
            }
            if (field.name === "used") {
              const { used, limit } = includedVisitProgress(row, plans, allRows["membershipUsage"] ?? []);
              return limit > 0 ? `${used} / ${limit}` : String(used);
            }
            return undefined;
          }}
          renderCell={(field, row, text) => {
            if (field.name !== "plan") return undefined;
            const plan = planForEnrollment(row, plans);
            if (!plan) return text;
            return (
              <span className="inline-flex items-center gap-0.5">
                <span className="truncate">{text}</span>
                <PlanInfoButton plan={plan} enrollment={row} />
              </span>
            );
          }}
        />
      ) : (
        <UsageLedger />
      )}
    </div>
  );
}

function UsageLedger() {
  const { view } = useListView();
  const { rows: usage } = useCollection("membershipUsage");
  const { allRows } = useData();
  const nameOf = (id: string) => customerName(allRows, id);

  if (usage.length === 0) {
    return <p className="text-sm text-muted-foreground">No membership usage yet. Complete a POS sale with included services.</p>;
  }

  if (view === "card") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {usage.map((u) => (
          <div key={String(u.id)} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex justify-between gap-2">
              <p className="font-medium">{String(nameOf(String(u["customerId"])))}</p>
              <Badge variant="secondary">{String(u["type"])}</Badge>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {String(u["customerId"])} · {String(u["membershipId"])}
            </p>
            <p className="mt-2 text-sm">
              {String(u["quantity"])}× {String(u["serviceName"])}
            </p>
            <p className="text-xs text-muted-foreground">
              {String(u["invoiceId"] || "—")} · {String(u["usedOn"] ?? "")}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Membership</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Used on</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usage.map((u) => (
            <TableRow key={String(u.id)}>
              <TableCell>
                {String(nameOf(String(u["customerId"])))}
                <span className="ml-1 font-mono text-[11px] text-muted-foreground">{String(u["customerId"])}</span>
              </TableCell>
              <TableCell className="font-mono text-xs">{String(u["membershipId"])}</TableCell>
              <TableCell>{String(u["serviceName"])}</TableCell>
              <TableCell>{String(u["quantity"])}</TableCell>
              <TableCell className="font-mono text-xs">{String(u["invoiceId"] || "—")}</TableCell>
              <TableCell>{String(u["usedOn"] ?? "")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
