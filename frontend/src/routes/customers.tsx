import { createFileRoute } from "@tanstack/react-router";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CrudPage } from "@/components/CrudPage";
import { PlanInfoButton } from "@/components/PlanInfoButton";
import { StockFlowNote } from "@/components/StockFlowNote";
import { modules } from "@/lib/modules";
import { useData } from "@/lib/store";
import { enrollmentAndPlan, membershipNameFromId } from "@/lib/membership";
import { useStockService } from "@/lib/stock";

const title = "Customers — Luxe Salon CRM";
const description = "Manage salon customer profiles, households, loyalty tiers and wallet balances.";
const NONE = "__none__";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Page,
});

function Page() {
  const { allRows, db, orgId } = useData();
  const stock = useStockService();
  const memberships = (allRows["memberships"] ?? []).filter((m) => String(m["orgId"]) === orgId);
  const plans = (allRows["membershipPlans"] ?? []).filter((p) => String(p["orgId"]) === orgId);

  return (
    <div className="space-y-6">
      <StockFlowNote />
      <CrudPage
      module={modules.customers}
      displayValue={(field, row) => {
        if (field.name !== "membershipId") return undefined;
        return membershipNameFromId(row["membershipId"], memberships, plans) || "—";
      }}
      renderCell={(field, row, text) => {
        if (field.name !== "membershipId") return undefined;
        const { enrollment, plan } = enrollmentAndPlan(row["membershipId"], memberships, plans);
        if (!plan) return text;
        return (
          <span className="inline-flex items-center gap-0.5">
            <span className="truncate">{text}</span>
            <PlanInfoButton plan={plan} enrollment={enrollment} />
          </span>
        );
      }}
      extraFields={({ editing, setEditing }) => {
        const currentId = String(editing["membershipId"] ?? "");
        const { enrollment, plan } = enrollmentAndPlan(currentId, memberships, plans);
        const options = memberships.filter((m) => {
          const owner = String(m["customerId"] ?? "");
          return !owner || owner === String(editing.id) || String(m.id) === currentId;
        });
        const cid = String(editing.id ?? "");
        const invoices = (db["invoices"] ?? []).filter((i) => String(i["customerId"]) === cid).slice(0, 5);
        const txs = (db["loyaltyTransactions"] ?? []).filter((t) => String(t["customerId"]) === cid).slice(0, 6);
        const products = stock.historyFor(cid);
        return (
          <>
            <div>
              <Label className="mb-1.5 inline-flex items-center gap-1">
                Membership
                <PlanInfoButton plan={plan} enrollment={enrollment} />
              </Label>
              <Select
                value={currentId || NONE}
                onValueChange={(v) => setEditing({ ...editing, membershipId: v === NONE ? "" : v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No membership" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No membership</SelectItem>
                  {options.map((m) => {
                    const name = membershipNameFromId(m.id, memberships, plans);
                    return (
                      <SelectItem key={String(m.id)} value={String(m.id)}>
                        {name} · {String(m.id)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {enrollment && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {String(enrollment["status"])} · {String(enrollment["startDate"] ?? "")} → {String(enrollment["endDate"] ?? "")}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Balances (updated by POS)</p>
              <p className="mt-1 text-muted-foreground">
                Loyalty {Number(editing["points"] ?? 0).toLocaleString("en-IN")} pts · wallet ₹
                {Number(editing["walletBalance"] ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
            {invoices.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium">Recent invoices</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {invoices.map((inv) => (
                    <li key={String(inv.id)}>
                      {String(inv.id)} · {String(inv["date"])} · ₹{Number(inv["total"] ?? 0).toLocaleString("en-IN")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {products.length > 0 && (
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium">Products used / sold</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {products.map((p) => (
                    <li key={p.skuId}>
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.used > 0 ? ` · Used: ${p.used}` : ""}
                      {p.sold > 0 ? ` · Sold: ${p.sold}` : ""}
                      <span className="ml-1 font-mono text-[11px]">{p.skuId}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {txs.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium">Loyalty ledger</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {txs.map((t) => (
                    <li key={String(t.id)}>
                      {String(t["type"])} {Number(t["points"] ?? 0)} pts · {String(t["invoiceId"] ?? "")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        );
      }}
    />
    </div>
  );
}
