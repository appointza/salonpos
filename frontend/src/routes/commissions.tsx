import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollection } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { useListView } from "@/lib/list-view";
import { staffName } from "@/lib/hr";

const title = "Commission Ledger — Luxe Salon CRM";
const description = "Commissions are generated from POS invoices, not typed independently.";

export const Route = createFileRoute("/commissions")({
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

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function Page() {
  const { org, scopeLabel } = useTenant();
  const { view } = useListView();
  const { rows: staff } = useCollection("staff");
  const { rows: commissions } = useCollection("commissions");
  const total = commissions.reduce((s, c) => s + Number(c["amount"] ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Commission ledger</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Each row is created when a POS bill is posted (staff + invoice + service/product). Payroll sums these amounts
          for the month. This list is not a separate master to type by hand.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Org · {org.name}</Badge>
          <Badge variant="secondary">Location · {scopeLabel}</Badge>
          <Badge variant="secondary">Period total · {money(total)}</Badge>
        </div>
      </header>

      {commissions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          No commissions yet. Complete a POS sale with a stylist assigned.
        </div>
      ) : view === "card" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {commissions.map((c) => (
            <div key={String(c.id)} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{staffName(staff, c["staffId"])}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{String(c["date"] ?? "")}</p>
                </div>
                <Badge variant="secondary">{String(c["status"] ?? "")}</Badge>
              </div>
              <p className="mt-2 text-sm">{String(c["item"] ?? "")}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{String(c["invoiceId"] ?? c["invoice"] ?? "")}</p>
              <p className="mt-3 text-sm">
                {money(Number(c["baseAmount"] ?? 0))} · {Number(c["rate"] ?? 0)}%
              </p>
              <p className="font-medium">{money(Number(c["amount"] ?? 0))}</p>
            </div>
          ))}
        </div>
      ) : (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Base</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {commissions.map((c) => (
                <TableRow key={String(c.id)}>
                  <TableCell className="font-mono text-xs">{String(c["date"] ?? "")}</TableCell>
                  <TableCell>
                    {staffName(staff, c["staffId"])}
                    <span className="ml-1 font-mono text-[11px] text-muted-foreground">{String(c["staffId"] ?? "")}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{String(c["invoiceId"] ?? c["invoice"] ?? "")}</TableCell>
                  <TableCell>
                    {String(c["item"] ?? "")}
                    {c["serviceId"] ? (
                      <span className="ml-1 font-mono text-[11px] text-muted-foreground">{String(c["serviceId"])}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{money(Number(c["baseAmount"] ?? 0))}</TableCell>
                  <TableCell>{Number(c["rate"] ?? 0)}%</TableCell>
                  <TableCell className="font-medium">{money(Number(c["amount"] ?? 0))}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{String(c["status"] ?? "")}</Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
