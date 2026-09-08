import { Gift, RotateCcw, Sparkles, Star, TicketPercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpinWheel } from "@/components/SpinWheel";
import type { Row } from "@/lib/store";
import type { CustomerWallet } from "@/lib/rewards/customer-wallet";

export function CustomerLoyaltyWallet({
  salonName,
  outlet,
  wallet,
  wheelProgram,
  segments,
  onSpinStart,
  onSpinComplete,
  spinResult,
}: {
  salonName: string;
  outlet: string;
  wallet: CustomerWallet;
  wheelProgram: Row | null;
  segments: Row[];
  onSpinStart: () => Row | null;
  onSpinComplete: (segment: Row) => void;
  spinResult: string;
}) {
  const { customer, points, tier, stampsCurrent, stampsRequired, spinAvailable, availableRewards, activity } = wallet;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-5 shadow-sm">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{salonName}</p>
        <p className="text-xs text-muted-foreground">{outlet}</p>
        <h1 className="font-display mt-3 text-2xl">Hi, {String(customer["name"] ?? "Guest").split(" ")[0]} 👋</h1>
        <Badge className="mt-2" variant="secondary">
          {tier} member
        </Badge>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <WalletStat icon={Star} label="Points" value={points.toLocaleString("en-IN")} />
          <WalletStat icon={RotateCcw} label="Visits" value={String(wallet.visits)} />
          <WalletStat icon={TicketPercent} label="Stamps" value={`${stampsCurrent} / ${stampsRequired}`} />
          <WalletStat icon={Sparkles} label="Spin" value={spinAvailable ? "Available" : "Used"} />
        </div>
      </div>

      {wheelProgram && spinAvailable && !spinResult ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-1 text-center text-sm font-semibold">Spin & Win</p>
          <p className="mb-3 text-center text-xs text-muted-foreground">One spin per check-in</p>
          <SpinWheel segments={segments} disabled={!spinAvailable} onSpinStart={onSpinStart} onResult={onSpinComplete} />
        </div>
      ) : null}

      {spinResult ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-sm text-muted-foreground">You won</p>
          <p className="font-display text-xl">{spinResult}</p>
          <p className="mt-1 text-xs text-muted-foreground">Show this at the desk or redeem at checkout</p>
        </div>
      ) : null}

      {!spinAvailable && wheelProgram && !spinResult && wallet.todaySpinLabel ? (
        <p className="text-center text-sm text-muted-foreground">Today&apos;s spin: {wallet.todaySpinLabel}</p>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Gift className="size-4 text-primary" />
          <p className="text-sm font-semibold">Available rewards</p>
        </div>
        {availableRewards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rewards yet — check in and spin to earn more.</p>
        ) : (
          <ul className="space-y-2">
            {availableRewards.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.valueLabel} · {r.source}
                  {r.expiresAt ? ` · Expires ${r.expiresAt}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activity.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Your activity</p>
          <ul className="space-y-2">
            {activity.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{a.date.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function WalletStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[10px] tracking-wide uppercase">{label}</span>
      </div>
      <p className="font-display mt-1 text-lg leading-tight">{value}</p>
    </div>
  );
}
