import { useCallback, useMemo } from "react";
import type { Row } from "@/lib/store";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export const CUSTOMER_TIERS = ["Bronze", "Silver", "Gold", "Platinum"] as const;
export type CustomerTier = (typeof CUSTOMER_TIERS)[number];

export type RewardChannel = "wheel" | "scratch" | "customerTier";

export type TierWeights = Record<CustomerTier, number>;

export type RewardDistributionConfig = {
  wheel: TierWeights;
  scratch: TierWeights;
  customerTier: TierWeights;
};

export const DEFAULT_TIER_WEIGHTS: TierWeights = {
  Bronze: 30,
  Silver: 35,
  Gold: 25,
  Platinum: 10,
};

export const DEFAULT_REWARD_DISTRIBUTION: RewardDistributionConfig = {
  wheel: { ...DEFAULT_TIER_WEIGHTS },
  scratch: { Bronze: 35, Silver: 35, Gold: 22, Platinum: 8 },
  customerTier: { Bronze: 40, Silver: 35, Gold: 20, Platinum: 5 },
};

const CHANNEL_FIELDS: Record<RewardChannel, string> = {
  wheel: "rewardWheelWeights",
  scratch: "rewardScratchWeights",
  customerTier: "rewardCustomerTierWeights",
};

function parseWeights(raw: unknown, fallback: TierWeights): TierWeights {
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as Partial<TierWeights>;
      return normalizeTierWeights(parsed, fallback);
    } catch {
      return { ...fallback };
    }
  }
  if (raw && typeof raw === "object") {
    return normalizeTierWeights(raw as Partial<TierWeights>, fallback);
  }
  return { ...fallback };
}

export function normalizeTierWeights(partial: Partial<TierWeights>, fallback = DEFAULT_TIER_WEIGHTS): TierWeights {
  const next = { ...fallback };
  for (const tier of CUSTOMER_TIERS) {
    const value = Number(partial[tier]);
    if (Number.isFinite(value) && value >= 0) next[tier] = value;
  }
  return next;
}

export function tierWeightPercents(weights: TierWeights) {
  const total = CUSTOMER_TIERS.reduce((sum, tier) => sum + Math.max(0, weights[tier] ?? 0), 0) || 1;
  return CUSTOMER_TIERS.map((tier) => ({
    tier,
    weight: Math.max(0, weights[tier] ?? 0),
    percent: Math.round((Math.max(0, weights[tier] ?? 0) / total) * 100),
  }));
}

export function rewardTierOf(item: Row): CustomerTier {
  const tier = String(item["rewardTier"] ?? item["tier"] ?? "Silver");
  return (CUSTOMER_TIERS.includes(tier as CustomerTier) ? tier : "Silver") as CustomerTier;
}

/** Weighted pick: item.winWeight × settings tier weight for item.rewardTier. */
export function pickTierWeightedReward(items: Row[], tierWeights: TierWeights): Row | null {
  const active = items.filter((s) => String(s["active"] ?? "Yes") !== "No");
  if (active.length === 0) return null;

  const scored = active.map((item) => {
    const tier = rewardTierOf(item);
    const itemWeight = Math.max(0, Number(item["winWeight"] ?? 1));
    const tierWeight = Math.max(0, Number(tierWeights[tier] ?? 0));
    return { item, effective: itemWeight * (tierWeight || 0) };
  });

  const total = scored.reduce((sum, s) => sum + s.effective, 0);
  if (total <= 0) {
    const fallbackTotal = active.reduce((sum, s) => sum + Math.max(0, Number(s["winWeight"] ?? 1)), 0);
    let roll = Math.random() * (fallbackTotal || 1);
    for (const seg of active) {
      roll -= Math.max(0, Number(seg["winWeight"] ?? 1));
      if (roll <= 0) return seg;
    }
    return active[active.length - 1] ?? null;
  }

  let roll = Math.random() * total;
  for (const { item, effective } of scored) {
    roll -= effective;
    if (roll <= 0) return item;
  }
  return scored[scored.length - 1]?.item ?? null;
}

export function rollCustomerTier(weights: TierWeights): CustomerTier {
  const picked = pickTierWeightedReward(
    CUSTOMER_TIERS.map((tier) => ({ id: tier, rewardTier: tier, winWeight: 1, active: "Yes" })),
    weights,
  );
  return rewardTierOf(picked ?? { rewardTier: "Silver" });
}

export function readRewardDistribution(orgRow: Row | undefined | null): RewardDistributionConfig {
  if (!orgRow) return { ...DEFAULT_REWARD_DISTRIBUTION };
  return {
    wheel: parseWeights(orgRow[CHANNEL_FIELDS.wheel], DEFAULT_REWARD_DISTRIBUTION.wheel),
    scratch: parseWeights(orgRow[CHANNEL_FIELDS.scratch], DEFAULT_REWARD_DISTRIBUTION.scratch),
    customerTier: parseWeights(orgRow[CHANNEL_FIELDS.customerTier], DEFAULT_REWARD_DISTRIBUTION.customerTier),
  };
}

export function serializeRewardDistribution(config: RewardDistributionConfig) {
  return {
    [CHANNEL_FIELDS.wheel]: JSON.stringify(normalizeTierWeights(config.wheel, DEFAULT_REWARD_DISTRIBUTION.wheel)),
    [CHANNEL_FIELDS.scratch]: JSON.stringify(normalizeTierWeights(config.scratch, DEFAULT_REWARD_DISTRIBUTION.scratch)),
    [CHANNEL_FIELDS.customerTier]: JSON.stringify(
      normalizeTierWeights(config.customerTier, DEFAULT_REWARD_DISTRIBUTION.customerTier),
    ),
  };
}

export function useRewardDistribution() {
  const { orgId } = useTenant();
  const { allRows, update } = useData();

  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === orgId),
    [allRows, orgId],
  );

  const config = useMemo(() => readRewardDistribution(orgRow), [orgRow]);

  const save = useCallback(
    (next: RewardDistributionConfig) => {
      if (!orgRow) return;
      update("organizations", String(orgRow.id), {
        ...orgRow,
        ...serializeRewardDistribution(next),
      });
    },
    [orgRow, update],
  );

  return { config, save, orgRow };
}
