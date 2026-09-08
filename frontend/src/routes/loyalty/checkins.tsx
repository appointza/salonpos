import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customerName } from "@/lib/customers/customer-lookup";
import { useCollection, useData } from "@/lib/store";

export const Route = createFileRoute("/loyalty/checkins")({
  component: CheckinsPage,
});

function CheckinsPage() {
  const { rows } = useCollection("qrCheckins");
  const { allRows } = useData();
  const nameOf = (id: string) => customerName(allRows, id);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No QR check-ins yet.</p>;
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
