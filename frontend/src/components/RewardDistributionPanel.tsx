import { CUSTOMER_TIERS, tierWeightPercents, type RewardChannel, type RewardDistributionConfig, type TierWeights } from "@/lib/reward-distribution";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function RewardDistributionPanel({
  value,
  onChange,
}: {
  value: RewardDistributionConfig;
  onChange: (next: RewardDistributionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      {(Object.keys(CHANNEL_META) as RewardChannel[]).map((channel) => (
        <TierWeightEditor
          key={channel}
          title={CHANNEL_META[channel].title}
          hint={CHANNEL_META[channel].hint}
          weights={value[channel]}
          onChange={(weights) => onChange({ ...value, [channel]: weights })}
        />
      ))}
      <p className="text-xs text-muted-foreground">
        Each wheel segment and scratch prize has a <strong>Reward tier</strong>. Final chance = segment weight × tier
        weight from this screen.
      </p>
    </div>
  );
}
