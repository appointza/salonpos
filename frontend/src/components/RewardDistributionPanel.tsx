import { CUSTOMER_TIERS, type CustomerTier, type RewardDistributionConfig, type RewardGame } from "@/pages/PrizeWheel/reward-distribution";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIER_BAR: Record<CustomerTier, string> = {
  Bronze: "bg-amber-600",
  Silver: "bg-slate-400",
  Gold: "bg-yellow-500",
  Platinum: "bg-violet-500",
};

const GAME_OPTIONS: { value: RewardGame; label: string }[] = [
  { value: "scratch", label: "Scratch card" },
  { value: "wheel", label: "Prize wheel" },
  { value: "both", label: "Both" },
];

export function RewardDistributionPanel({
  value,
  onChange,
}: {
  value: RewardDistributionConfig;
  onChange: (next: RewardDistributionConfig) => void;
}) {
  function patchTier(tier: CustomerTier, patch: Partial<RewardDistributionConfig["tierGames"][CustomerTier]>) {
    const current = value.tierGames[tier];
    let next = { ...current, ...patch };
    if (next.channel === "scratch") next = { ...next, wheelCount: 0, scratchCount: Math.max(0, next.scratchCount) };
    if (next.channel === "wheel") next = { ...next, scratchCount: 0, wheelCount: Math.max(0, next.wheelCount) };
    onChange({ ...value, tierGames: { ...value.tierGames, [tier]: next } });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        For each reward tier, pick Scratch card, Prize wheel, or Both, then how many prizes of that tier sit on each
        game. Walk-in and public booking only show the game for that customer’s tier.
      </p>
      {CUSTOMER_TIERS.map((tier) => {
        const game = value.tierGames[tier];
        return (
          <div key={tier} className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${TIER_BAR[tier]}`} />
              <p className="font-medium">{tier}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="mb-1.5">Which game</Label>
                <Select value={game.channel} onValueChange={(v) => patchTier(tier, { channel: v as RewardGame })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {game.channel !== "wheel" ? (
                <div>
                  <Label className="mb-1.5">Scratch prizes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(game.scratchCount)}
                    onChange={(e) => patchTier(tier, { scratchCount: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </div>
              ) : null}
              {game.channel !== "scratch" ? (
                <div>
                  <Label className="mb-1.5">Wheel prizes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(game.wheelCount)}
                    onChange={(e) => patchTier(tier, { wheelCount: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Tag each scratch prize and wheel slice with Who can win this. POS still applies the prize type and value: bonus
        points immediately; discount, free service, and partner gifts stay pending until the next bill.
      </p>
    </div>
  );
}
