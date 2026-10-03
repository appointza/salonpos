import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CrudPage, type ModuleDef } from "@/components/CrudPage";
import { ServiceMatchField } from "@/components/ServiceMatchField";
import { PlanInfoButton } from "@/components/PlanInfoButton";
import { useCollection, useData, type Row } from "@/store";
import { customerName } from "@/pages/Customers/customer-lookup";
import {
  addCalendarMonths,
  includedVisitProgress,
  parseMatchList,
  planForEnrollment,
  resolveServiceFromToken,
  formatServiceSpec,
} from "@/pages/Memberships/membership";
import { useListView } from "@/list-view";

const TABS = [
  { key: "plans", label: "1. Plans" },
  { key: "members", label: "2. Members" },
  { key: "usage", label: "3. Visit history" },
] as const;

const membershipPlansModule: ModuleDef = {
  key: "membershipPlans",
  title: "Membership plans",
  subtitle: "Create a plan once, then sell it to many customers.",
  idPrefix: "PLAN-",
  fields: [
    { name: "name", label: "Plan name", table: true },
    { name: "price", label: "Sell price", type: "number", money: true, table: true },
    { name: "validityMonths", label: "Valid for (months)", type: "number", table: true },
    { name: "benefits", label: "Short description (shown to customers)", type: "textarea", table: true },
    { name: "includedMatch", label: "Free services", table: true },
    { name: "includedLimit", label: "Free visits allowed", type: "number", table: true },
    { name: "extraDiscountMatch", label: "Discounted services" },
    { name: "extraDiscountPct", label: "Service discount %", type: "number" },
    { name: "retailDiscountPct", label: "Product discount %", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["Active", "Paused"], table: true, badge: true },
  ],
};

const membershipsModule: ModuleDef = {
  key: "memberships",
  title: "Members",
  subtitle: "Sell a plan to a customer. Billing at POS uses this automatically.",
  idPrefix: "MP-",
  fields: [
    { name: "planId", label: "Plan ID", table: false, form: false },
    { name: "plan", label: "Plan", type: "select", table: true, badge: true },
    { name: "customerId", label: "Customer", type: "select", table: true },
    { name: "startDate", label: "Starts", type: "date", table: true },
    { name: "endDate", label: "Ends", type: "date", table: true },
    { name: "used", label: "Free visits used", type: "number", table: true, form: false },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["Active", "Frozen", "Expired", "Cancelled"],
      table: true,
      badge: true,
    },
  ],
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function planEndDate(start: string, months: number) {
  if (!start || !months) return "";
  return addCalendarMonths(start, months);
}

function PlanPreview({ editing, services }: { editing: Row; services: Row[] }) {
  const freeServices = parseMatchList(editing["includedMatch"]).map(
    (t) => String(resolveServiceFromToken(t, services)?.["name"] ?? t),
  );
  const discountServices = parseMatchList(editing["extraDiscountMatch"]).map(
    (t) => String(resolveServiceFromToken(t, services)?.["name"] ?? t),
  );
  const limit = Number(editing["includedLimit"] ?? 0);
  const extraPct = Number(editing["extraDiscountPct"] ?? 0);
  const retailPct = Number(editing["retailDiscountPct"] ?? 0);
  const overlap = freeServices.filter((s) => discountServices.some((d) => d.toLowerCase() === s.toLowerCase()));
  const unlimitedFree = freeServices.length > 0 && limit <= 0;

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <p className="font-medium">At billing, this plan will:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        {freeServices.length > 0 ? (
          <li>
            Make <span className="font-medium text-foreground">{freeServices.join(", ")}</span>{" "}
            <span className="font-medium text-foreground">free</span>
            {limit <= 0 ? " with no visit limit" : ` for up to ${limit} visit${limit === 1 ? "" : "s"}`}
          </li>
        ) : (
          <li>Not give any free services</li>
        )}
        {extraPct > 0 && discountServices.length > 0 ? (
          <li>
            Take <span className="font-medium text-foreground">{extraPct}% off</span>{" "}
            {discountServices.join(", ")}
          </li>
        ) : extraPct > 0 ? (
          <li>Service discount % is set, but no discounted services are selected — nothing will be reduced</li>
        ) : (
          <li>Not give a % off on services</li>
        )}
        {retailPct > 0 ? (
          <li>
            Take <span className="font-medium text-foreground">{retailPct}% off products</span> sold at POS
          </li>
        ) : (
          <li>Not discount products</li>
        )}
      </ul>
      {unlimitedFree ? (
        <p className="mt-2 text-xs text-amber-700">
          Free services with 0 visits means unlimited free visits. For 10% off instead of free, leave Free
          services empty and put the service under Discounted services.
        </p>
      ) : null}
      {overlap.length > 0 && extraPct > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {overlap.join(", ")} is both free and discounted: it is free first, then {extraPct}% off after free
          visits are used.
        </p>
      ) : null}
    </div>
  );
}

export function Page() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("plans");
  const { allRows, orgId } = useData();
  const plans = (allRows["membershipPlans"] ?? []).filter((p) => String(p["orgId"]) === String(orgId));
  const orgServices = useMemo(
    () =>
      (allRows["services"] ?? [])
        .filter((s) => String(s["orgId"]) === String(orgId) && String(s["active"] ?? "Yes") !== "No")
        .sort((a, b) => String(a["name"]).localeCompare(String(b["name"]))),
    [allRows, orgId],
  );
  const customers = useMemo(
    () =>
      (allRows["customers"] ?? [])
        .filter((c) => String(c["orgId"]) === String(orgId))
        .sort((a, b) => String(a["name"]).localeCompare(String(b["name"]))),
    [allRows, orgId],
  );
  const planOptions = useMemo(
    () =>
      plans
        .filter((p) => String(p["status"] ?? "Active") !== "Paused")
        .map((p) => ({
          value: String(p.id),
          label: `${String(p["name"])} · ₹${Number(p["price"] ?? 0).toLocaleString("en-IN")}`,
        })),
    [plans],
  );
  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: `${String(c["name"])}${c["phone"] ? ` · ${String(c["phone"])}` : ""}`,
      })),
    [customers],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p className="font-medium">How memberships work</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Plans</span> — decide what the member gets (free
            visits, % off services, % off products).
          </li>
          <li>
            <span className="font-medium text-foreground">Members</span> — sell that plan to a customer.
          </li>
          <li>
            <span className="font-medium text-foreground">POS</span> — when you bill that customer, discounts
            apply automatically. Visit history is written after a paid bill.
          </li>
        </ol>
      </div>
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
        <CrudPage
          module={membershipPlansModule}
          newButtonLabel="New plan"
          inlineEditable={["status", "price"]}
          renderFormField={(field, editing, setEditing) => {
            if (field.name === "includedMatch") {
              return (
                <ServiceMatchField
                  id={field.name}
                  label="Free services"
                  hint="These services are 100% free at POS, until the visit limit is used."
                  value={String(editing[field.name] ?? "")}
                  onChange={(v) => setEditing({ ...editing, [field.name]: v })}
                  services={orgServices}
                />
              );
            }
            if (field.name === "includedLimit") {
              return (
                <div>
                  <Label htmlFor={field.name}>How many free visits?</Label>
                  <p className="mb-2 mt-1 text-xs text-muted-foreground">
                    Example: 10 = ten free visits. 0 = unlimited free visits.
                  </p>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    value={Number(editing[field.name] ?? 0)}
                    onChange={(e) => setEditing({ ...editing, [field.name]: Number(e.target.value) })}
                  />
                </div>
              );
            }
            if (field.name === "extraDiscountMatch") {
              return (
                <ServiceMatchField
                  id={field.name}
                  label="Discounted services"
                  hint="These services get the % off below. They are not free."
                  value={String(editing[field.name] ?? "")}
                  onChange={(v) => setEditing({ ...editing, [field.name]: v })}
                  services={orgServices}
                />
              );
            }
            return undefined;
          }}
          extraFields={({ editing }) => <PlanPreview editing={editing} services={orgServices} />}
          displayValue={(field, row) => {
            if (field.name === "includedMatch" || field.name === "extraDiscountMatch") {
              return formatServiceSpec(row[field.name], orgServices) || undefined;
            }
            return undefined;
          }}
        />
      ) : tab === "members" ? (
        <CrudPage
          module={membershipsModule}
          newButtonLabel="Add member"
          inlineEditable={["status"]}
          prepareNew={(row) => ({
            ...row,
            startDate: String(row["startDate"] || todayIso()),
            status: String(row["status"] || "Active"),
            used: 0,
          })}
          prepareSave={(row) => {
            const plan = plans.find((p) => String(p.id) === String(row["planId"] || ""))
              ?? plans.find((p) => String(p["name"]) === String(row["plan"] ?? ""));
            const start = String(row["startDate"] || todayIso());
            const months = Number(plan?.["validityMonths"] ?? 0);
            return {
              ...row,
              planId: Number(plan?.id ?? row["planId"] ?? 0),
              plan: String(plan?.["name"] ?? row["plan"] ?? ""),
              customerId: Number(row["customerId"] ?? 0),
              startDate: start,
              endDate: String(row["endDate"] || planEndDate(start, months)),
              status: String(row["status"] || "Active"),
            };
          }}
          validate={(row) => {
            if (!row["customerId"]) return "Select a customer.";
            if (!row["planId"] && !row["plan"]) return "Select a plan.";
            return null;
          }}
          selectOptions={(field) => {
            if (field.name === "customerId") return customerOptions;
            if (field.name === "plan") return planOptions;
            return undefined;
          }}
          renderFormField={(field, editing, setEditing) => {
            if (field.name === "customerId") {
              const value = String(editing["customerId"] ?? "");
              return (
                <div>
                  <Label htmlFor="customerId">Customer</Label>
                  <p className="mb-2 mt-1 text-xs text-muted-foreground">Who is buying this plan.</p>
                  <Select
                    value={value && customerOptions.some((o) => o.value === value) ? value : undefined}
                    onValueChange={(v) => setEditing({ ...editing, customerId: Number(v) })}
                  >
                    <SelectTrigger id="customerId" className="w-full">
                      <SelectValue placeholder="Select a customer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            if (field.name !== "plan") return undefined;
            const selectedId =
              String(editing["planId"] || "") ||
              String(plans.find((p) => String(p["name"]) === String(editing["plan"] ?? ""))?.id ?? "");
            return (
              <div>
                <Label htmlFor="plan">Plan</Label>
                <p className="mb-2 mt-1 text-xs text-muted-foreground">
                  End date is filled from the plan’s months if you leave it empty.
                </p>
                <Select
                  value={selectedId && planOptions.some((o) => o.value === selectedId) ? selectedId : undefined}
                  onValueChange={(v) => {
                    const plan = plans.find((p) => String(p.id) === v);
                    const start = String(editing["startDate"] || todayIso());
                    const months = Number(plan?.["validityMonths"] ?? 0);
                    setEditing({
                      ...editing,
                      planId: Number(v),
                      plan: String(plan?.["name"] ?? ""),
                      startDate: start,
                      endDate: planEndDate(start, months) || String(editing["endDate"] ?? ""),
                    });
                  }}
                >
                  <SelectTrigger id="plan" className="w-full">
                    <SelectValue placeholder="Select a plan…" />
                  </SelectTrigger>
                  <SelectContent>
                    {planOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }}
          displayValue={(field, row) => {
            if (field.name === "customerId") {
              const c = customers.find((x) => String(x.id) === String(row["customerId"]));
              return c ? String(c["name"]) : String(row["customerId"] ?? "");
            }
            if (field.name === "used") {
              const { used, limit } = includedVisitProgress(row, plans, allRows["membershipUsage"] ?? []);
              if (limit <= 0) return used ? `${used} used (unlimited)` : "Unlimited";
              return `${used} / ${limit}`;
            }
            return undefined;
          }}
          renderCell={(field, row, text) => {
            if (field.name !== "plan") return undefined;
            const plan = planForEnrollment(row, plans);
            if (!plan) return text;
            return (
              <span className="inline-flex items-center gap-0.5">
                <span className="truncate">{String(plan["name"] ?? text)}</span>
                <PlanInfoButton plan={plan} enrollment={row} />
              </span>
            );
          }}
        />
      ) : (
        <UsageLedger plans={plans} />
      )}
    </div>
  );
}

function UsageLedger({ plans }: { plans: Row[] }) {
  const { view } = useListView();
  const { rows: usage } = useCollection("membershipUsage");
  const { allRows } = useData();
  const nameOf = (id: string) => customerName(allRows, id);
  const memberships = allRows["memberships"] ?? [];
  const planNameFor = (membershipId: string) => {
    const mem = memberships.find((m) => String(m.id) === membershipId);
    if (!mem) return "—";
    return String(planForEnrollment(mem, plans)?.["name"] ?? mem["plan"] ?? "—");
  };
  const typeLabel = (type: string) => (type === "Included" ? "Free visit" : type);

  if (usage.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No visits recorded yet. After you bill a member at POS for a free service, it shows up here.
      </p>
    );
  }

  if (view === "card") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {usage.map((u) => (
          <div key={String(u.id)} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex justify-between gap-2">
              <p className="font-medium">{String(nameOf(String(u["customerId"])))}</p>
              <Badge variant="secondary">{typeLabel(String(u["type"]))}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{planNameFor(String(u["membershipId"]))}</p>
            <p className="mt-2 text-sm">
              {String(u["quantity"])}× {String(u["serviceName"])}
            </p>
            <p className="text-xs text-muted-foreground">{String(u["usedOn"] ?? "")}</p>
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
            <TableHead>Plan</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usage.map((u) => (
            <TableRow key={String(u.id)}>
              <TableCell>{String(nameOf(String(u["customerId"])))}</TableCell>
              <TableCell>{planNameFor(String(u["membershipId"]))}</TableCell>
              <TableCell>{String(u["serviceName"])}</TableCell>
              <TableCell>{String(u["quantity"])}</TableCell>
              <TableCell>{typeLabel(String(u["type"]))}</TableCell>
              <TableCell>{String(u["usedOn"] ?? "")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
