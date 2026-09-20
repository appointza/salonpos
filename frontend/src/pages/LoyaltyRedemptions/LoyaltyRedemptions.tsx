import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customerName } from "@/lib/customers/customer-lookup";
import { useData } from "@/lib/store";

export function RedemptionsPage() {
  const { allRows } = useData();
  const offers = allRows["qrOfferRedemptions"] ?? [];
  const spins = (allRows["wheelSpins"] ?? []).filter((s) => String(s["status"]) === "Redeemed");
  const rewards = (allRows["customerRewards"] ?? []).filter((r) => String(r["status"]) === "Redeemed");
  const rows = [
    ...offers.map((r) => ({ kind: "Offer", row: r })),
    ...spins.map((r) => ({ kind: "Wheel", row: r })),
    ...rewards.map((r) => ({ kind: "Stamp", row: r })),
  ].sort((a, b) =>
    String(b.row["redeemedAt"] ?? b.row["issuedAt"] ?? "").localeCompare(
      String(a.row["redeemedAt"] ?? a.row["issuedAt"] ?? ""),
    ),
  );

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No redemptions recorded yet.</p>;
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Reward</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ kind, row }) => (
            <TableRow key={`${kind}-${String(row.id)}`}>
              <TableCell>{kind}</TableCell>
              <TableCell>{customerName(allRows, String(row["customerId"] ?? ""))}</TableCell>
              <TableCell className="text-sm">
                {String(row["offerTitle"] ?? row["label"] ?? row["title"] ?? row.id)}
              </TableCell>
              <TableCell className="font-mono text-xs">{String(row["invoiceId"] ?? "—")}</TableCell>
              <TableCell>
                <Badge variant="secondary">{String(row["status"] ?? "")}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
