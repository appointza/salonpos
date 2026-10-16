import { useSearch } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customerName } from "@/pages/Customers/customer-lookup";
import { useApi, useCollection } from "@/hooks/useApi";
import { useListView } from "@/list-view";

function friendlyReason(row: Record<string, unknown>) {
  const reason = String(row["reason"] ?? "");
  if (reason) return reason;
  const source = String(row["sourceType"] ?? row["source"] ?? "");
  if (source.includes("checkin") || source.includes("Check-in")) return "Check-in";
  if (source.includes("appointment") || source.includes("Appointment")) return "Appointment";
  if (source.includes("birthday")) return "Birthday bonus";
  if (source.includes("POS") || row["invoiceId"]) return "Visit / POS";
  return "Loyalty activity";
}

export function LoyaltyHistoryPage() {
  const { view } = useListView();
  const { tab } = useSearch({ from: "/_app/loyalty/history" });
  const { rows: txs } = useCollection("loyaltyTransactions");
  const { allRows } = useApi();
  const nameOf = (id: string) => customerName(allRows, id);

  const offers = allRows["qrOfferRedemptions"] ?? [];
  const spins = (allRows["wheelSpins"] ?? []).filter((s) => String(s["status"]) === "Redeemed");
  const rewards = (allRows["customerRewards"] ?? []).filter((r) => String(r["status"]) === "Redeemed");
  const redemptionRows = [
    ...offers.map((r) => ({ kind: "Offer", row: r })),
    ...spins.map((r) => ({ kind: "Reward", row: r })),
    ...rewards.map((r) => ({ kind: "Reward", row: r })),
  ].sort((a, b) =>
    String(b.row["redeemedAt"] ?? b.row["issuedAt"] ?? "").localeCompare(
      String(a.row["redeemedAt"] ?? a.row["issuedAt"] ?? ""),
    ),
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl">Loyalty history</h2>
        <p className="mt-1 text-sm text-muted-foreground">Points earned and rewards used — in plain language.</p>
      </div>

      <Tabs defaultValue={tab === "redeemed" ? "redeemed" : "points"}>
        <TabsList>
          <TabsTrigger value="points">Points activity</TabsTrigger>
          <TabsTrigger value="redeemed">Rewards used</TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="mt-4">
          {txs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No point activity yet.</p>
          ) : view === "card" ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {txs.map((t) => {
                  const earn = String(t["type"]) === "Earn";
                  return (
                    <div key={String(t.id)} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <p className="font-medium">{nameOf(String(t["customerId"] ?? ""))}</p>
                      <p className="mt-1 text-sm">{friendlyReason(t)}</p>
                      <p className={`mt-2 text-sm ${earn ? "text-emerald-600" : "text-amber-700"}`}>
                        {earn ? "+" : "−"}
                        {Number(t["points"] ?? 0)} pts
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{String(t["createdAt"] ?? t["createdon"] ?? "—")}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.map((t) => {
                    const earn = String(t["type"]) === "Earn";
                    return (
                      <TableRow key={String(t.id)}>
                        <TableCell>{nameOf(String(t["customerId"] ?? ""))}</TableCell>
                        <TableCell className="text-sm">{friendlyReason(t)}</TableCell>
                        <TableCell className={earn ? "text-emerald-600" : "text-amber-700"}>
                          {earn ? "+" : "−"}
                          {Number(t["points"] ?? 0)} pts
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {String(t["createdAt"] ?? t["createdon"] ?? "—")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="redeemed" className="mt-4">
          {redemptionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rewards used yet.</p>
          ) : view === "card" ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {redemptionRows.map(({ row }) => (
                  <div key={String(row.id)} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{nameOf(String(row["customerId"] ?? ""))}</p>
                      <Badge variant="secondary">{String(row["status"] ?? "Used")}</Badge>
                    </div>
                    <p className="mt-1 text-sm">{String(row["offerTitle"] ?? row["label"] ?? row["title"] ?? row.id)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {String(row["redeemedAt"] ?? row["issuedAt"] ?? "—")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptionRows.map(({ row }) => (
                    <TableRow key={String(row.id)}>
                      <TableCell>{nameOf(String(row["customerId"] ?? ""))}</TableCell>
                      <TableCell className="text-sm">
                        {String(row["offerTitle"] ?? row["label"] ?? row["title"] ?? row.id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{String(row["status"] ?? "Used")}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {String(row["redeemedAt"] ?? row["issuedAt"] ?? "—")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
