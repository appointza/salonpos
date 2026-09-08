import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Gift, QrCode, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/loyalty/overview")({
  component: LoyaltyOverviewPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function LoyaltyOverviewPage() {
  const { org, locationId } = useTenant();
  const { allRows } = useData();
  const scoped = (key: string) =>
    (allRows[key] ?? []).filter((r) => {
      if (String(r["orgId"] ?? org.orgId) !== org.orgId) return false;
      if (locationId !== "all" && r["locationId"] && String(r["locationId"]) !== locationId) return false;
      return true;
    });

  const customers = scoped("customerLoyalty");
  const enrolled = customers.length || scoped("customers").length;
  const txs = scoped("loyaltyTransactions");
  const pointsIssued = txs.filter((t) => String(t["type"]) === "Earn").reduce((s, t) => s + Number(t["points"] ?? 0), 0);
  const pointsRedeemed = txs
    .filter((t) => String(t["type"]) === "Redeem")
    .reduce((s, t) => s + Number(t["points"] ?? 0), 0);
  const rewardsRedeemed =
    scoped("customerRewards").filter((r) => String(r["status"]) === "Redeemed").length +
    scoped("wheelSpins").filter((r) => String(r["status"]) === "Redeemed").length +
    scoped("qrOfferRedemptions").filter((r) => String(r["status"]) === "Redeemed").length;

  const day = today();
  const checkinsToday = scoped("qrCheckins").filter((c) => String(c["visitAt"] ?? c["createdon"] ?? "").startsWith(day));
  const rewardsEarnedToday =
    scoped("customerRewards").filter((r) => String(r["issuedAt"] ?? "").startsWith(day)).length +
    scoped("wheelSpins").filter((r) => String(r["spunAt"] ?? r["createdAt"] ?? "").startsWith(day)).length;
  const rewardsRedeemedToday =
    scoped("customerRewards").filter((r) => String(r["redeemedAt"] ?? "").startsWith(day)).length +
    scoped("wheelSpins").filter((r) => String(r["redeemedAt"] ?? "").startsWith(day)).length;
  const wheelSpinsToday = scoped("wheelSpins").filter((r) =>
    String(r["spunAt"] ?? r["createdAt"] ?? "").startsWith(day),
  ).length;

  const stats = [
    { label: "Customers enrolled", value: enrolled.toLocaleString("en-IN"), icon: Users },
    { label: "Points issued", value: pointsIssued.toLocaleString("en-IN"), icon: Sparkles },
    { label: "Points redeemed", value: pointsRedeemed.toLocaleString("en-IN"), icon: Gift },
    { label: "Rewards redeemed", value: rewardsRedeemed.toLocaleString("en-IN"), icon: QrCode },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl">Loyalty overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">A quick snapshot of how customers are earning and using rewards.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="size-4" />
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="mt-2 font-display text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-medium">Today&apos;s activity</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between border-b border-border/60 pb-2">
            <span className="text-muted-foreground">Check-ins</span>
            <span className="font-medium">{checkinsToday.length}</span>
          </li>
          <li className="flex justify-between border-b border-border/60 pb-2">
            <span className="text-muted-foreground">Rewards earned</span>
            <span className="font-medium">{rewardsEarnedToday}</span>
          </li>
          <li className="flex justify-between border-b border-border/60 pb-2">
            <span className="text-muted-foreground">Rewards redeemed</span>
            <span className="font-medium">{rewardsRedeemedToday}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted-foreground">Wheel spins</span>
            <span className="font-medium">{wheelSpinsToday}</span>
          </li>
        </ul>
        <Button className="mt-4" variant="outline" size="sm" asChild>
          <Link to="/loyalty/history">
            View activity <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
