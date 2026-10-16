import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListView } from "@/list-view";
import { customerName } from "@/pages/Customers/customer-lookup";
import { useCollection, useData } from "@/store";

export function CheckinsPage() {
  const { view } = useListView();
  const { rows } = useCollection("qrCheckins");
  const { allRows } = useData();
  const nameOf = (id: string) => customerName(allRows, id);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No QR check-ins yet.</p>;
  }

  if (view === "card") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => (
          <div key={String(c.id)} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{nameOf(String(c["customerId"] ?? ""))}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{String(c["customerId"] ?? "")}</p>
              </div>
              <Badge variant="secondary">{String(c["status"] ?? "")}</Badge>
            </div>
            <p className="mt-2 text-sm">{String(c["visitAt"] ?? "")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{String(c["rewardEarned"] ?? "")}</p>
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
            <TableHead>Visit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rewards</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={String(c.id)}>
              <TableCell>
                {nameOf(String(c["customerId"] ?? ""))}
                <span className="ml-1 font-mono text-[11px] text-muted-foreground">{String(c["customerId"] ?? "")}</span>
              </TableCell>
              <TableCell className="text-sm">{String(c["visitAt"] ?? "")}</TableCell>
              <TableCell>
                <Badge variant="secondary">{String(c["status"] ?? "")}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{String(c["rewardEarned"] ?? "")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
