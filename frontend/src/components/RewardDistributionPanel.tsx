import { CUSTOMER_TIERS, tierWeightPercents, type RewardChannel, type RewardDistributionConfig, type RewardGame, type TierWeights } from "@/lib/reward-distribution";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CHANNEL_META: Record<RewardChannel, { title: string; hint: string }> = {
  wheel: {
    title: "Prize wheel",
    hint: "How often Bronze vs Silver vs Gold vs Platinum prizes appear on /prize-wheel.",
  },
  scratch: {
    title: "Scratch card",
    hint: "Tier mix when guests scratch on the public booking page or outlet QR.",
  },
  customerTier: {
    title: "New customer tier",
    hint: "Weighted tier assigned when a guest is first recognised by mobile number.",
  },
};

function TierWeightEditor({
  title,
  hint,
  weights,
  onChange,
}: {
  title: string;
  hint: string;
  weights: TierWeights;
  onChange: (next: TierWeights) => void;
}) {
  const percents = tierWeightPercents(weights);

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {CUSTOMER_TIERS.map((tier) => (
          <div key={tier}>
            <Label className="mb-1.5 text-xs">{tier} weight</Label>
            <Input
              type="number"
              min={0}
              value={weights[tier]}
              onChange={(e) => onChange({ ...weights, [tier]: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
        {percents.map((p) =>
          p.percent > 0 ? (
            <div
              key={p.tier}
              className="h-full transition-all"
              style={{
                width: `${p.percent}%`,
                backgroundColor:
                  p.tier === "Bronze"
                    ? "#cd7f32"
                    : p.tier === "Silver"
                      ? "#94a3b8"
                      : p.tier === "Gold"
                        ? "#eab308"
                        : "#a855f7",
              }}
              title={`${p.tier} ${p.percent}%`}
            />
          ) : null,
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {percents.map((p) => `${p.tier} ${p.percent}%`).join(" · ")}
      </p>
    </div>
  );
}

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
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="font-medium">Reward tier → game</p>
        <p className="mt-1 text-xs text-muted-foreground">
          For each tier, choose whether that guest plays the scratch card, the prize wheel, or both, and how many
          prizes of that tier sit on each game. Walk-in, online booking, and the draw odds use this.
        </p>
        <div className="mt-4 space-y-4">
          {CUSTOMER_TIERS.map((tier) => {
            const game = value.tierGames[tier];
            const patch = (next: Partial<typeof game>) =>
              onChange({
                ...value,
                tierGames: { ...value.tierGames, [tier]: { ...game, ...next } },
              });
            return (
              <div key={tier} className="grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
                <div>
                  <Label className="mb-1.5 text-xs">{tier}</Label>
                  <Select value={game.channel} onValueChange={(channel) => patch({ channel: channel as RewardGame })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GAME_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 text-xs">Scratch prizes</Label>
                  <Input
                    type="number"
                    min={0}
                    disabled={game.channel === "wheel"}
                    value={game.scratchCount}
                    onChange={(e) => patch({ scratchCount: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs">Wheel prizes</Label>
                  <Input
                    type="number"
                    min={0}
                    disabled={game.channel === "scratch"}
                    value={game.wheelCount}
                    onChange={(e) => patch({ wheelCount: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <TierWeightEditor
        title={CHANNEL_META.customerTier.title}
        hint={CHANNEL_META.customerTier.hint}
        weights={value.customerTier}
        onChange={(customerTier) => onChange({ ...value, customerTier })}
      />
      <p className="text-xs text-muted-foreground">
        Prize label on Scratch card and Prize wheel is the name the guest sees. Prize type and value are what POS
        applies when they claim the reward on the next bill. Each prize is tagged with a reward tier so the counts
        above decide how often it is drawn.
      </p>
    </div>
  );
}
