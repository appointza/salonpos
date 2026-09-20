import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customerName } from "@/lib/customers/customer-lookup";
import { useCollection, useData } from "@/lib/store";
import { useListView } from "@/lib/list-view";

export function LedgerPage() {
  const { view } = useListView();
  const { rows: txs } = useCollection("loyaltyTransactions");
  const { allRows } = useData();
  const nameOf = (id: string) => customerName(allRows, id);

  if (txs.length === 0) {
    return <p className="text-sm text-muted-foreground">No loyalty transactions yet. Complete a POS sale.</p>;
  }

  if (view === "card") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {txs.map((t) => (
          <div key={String(t.id)} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex justify-between gap-2">
              <p className="font-medium">{String(nameOf(String(t["customerId"])))}</p>
              <Badge variant="secondary">{String(t["type"])}</Badge>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">{String(t["customerId"])}</p>
            <p className="mt-2 text-sm">
              {String(t["type"]) === "Earn" ? "+" : "−"}
              {Number(t["points"] ?? 0)} pts
            </p>
            <p className="text-xs text-muted-foreground">
              {String(t["balanceBefore"])} → {String(t["balanceAfter"])} · {String(t["invoiceId"] ?? "")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{String(t["reason"] ?? "")}</p>
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
            <TableHead>Invoice</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {txs.map((t) => (
            <TableRow key={String(t.id)}>
              <TableCell>
                {String(nameOf(String(t["customerId"])))}
                <span className="ml-1 font-mono text-[11px] text-muted-foreground">{String(t["customerId"])}</span>
              </TableCell>
              <TableCell className="font-mono text-xs">{String(t["invoiceId"] ?? "")}</TableCell>
              <TableCell>
                <Badge variant="secondary">{String(t["type"])}</Badge>
              </TableCell>
              <TableCell>
                {String(t["type"]) === "Earn" ? "+" : "−"}
                {Number(t["points"] ?? 0)}
              </TableCell>
              <TableCell className="text-xs">
                {String(t["balanceBefore"])} → {String(t["balanceAfter"])}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{String(t["source"] ?? "—")}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{String(t["reason"] ?? "")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
