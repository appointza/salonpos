import { useCallback, useMemo } from "react";
import type { Row } from "@/lib/store";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export const CUSTOMER_TIERS = ["Bronze", "Silver", "Gold", "Platinum"] as const;
export type CustomerTier = (typeof CUSTOMER_TIERS)[number];

export type RewardChannel = "wheel" | "scratch" | "customerTier";
export type RewardGame = "scratch" | "wheel" | "both";

export type TierWeights = Record<CustomerTier, number>;

export type TierGameConfig = {
  channel: RewardGame;
  scratchCount: number;
  wheelCount: number;
};

export type TierGames = Record<CustomerTier, TierGameConfig>;

export type RewardDistributionConfig = {
  wheel: TierWeights;
  scratch: TierWeights;
  customerTier: TierWeights;
  tierGames: TierGames;
};

export const DEFAULT_TIER_WEIGHTS: TierWeights = {
  Bronze: 30,
  Silver: 35,
  Gold: 25,
  Platinum: 10,
};

export const DEFAULT_TIER_GAMES: TierGames = {
  Bronze: { channel: "scratch", scratchCount: 3, wheelCount: 0 },
  Silver: { channel: "both", scratchCount: 2, wheelCount: 2 },
  Gold: { channel: "wheel", scratchCount: 0, wheelCount: 2 },
  Platinum: { channel: "wheel", scratchCount: 0, wheelCount: 1 },
};

export const DEFAULT_REWARD_DISTRIBUTION: RewardDistributionConfig = {
  wheel: weightsFromGames(DEFAULT_TIER_GAMES, "wheel"),
  scratch: weightsFromGames(DEFAULT_TIER_GAMES, "scratch"),
  customerTier: { Bronze: 40, Silver: 35, Gold: 20, Platinum: 5 },
  tierGames: { ...DEFAULT_TIER_GAMES },
};

function weightsFromGames(games: TierGames, side: "scratch" | "wheel"): TierWeights {
  const next = {} as TierWeights;
  for (const tier of CUSTOMER_TIERS) {
    const game = games[tier];
    const allowed = game.channel === "both" || game.channel === side;
    const count = side === "scratch" ? game.scratchCount : game.wheelCount;
    next[tier] = allowed ? Math.max(0, Number(count) || 0) : 0;
  }
  return next;
}

export function applyTierGames(config: RewardDistributionConfig): RewardDistributionConfig {
  return {
    ...config,
    wheel: weightsFromGames(config.tierGames, "wheel"),
    scratch: weightsFromGames(config.tierGames, "scratch"),
  };
}

export function gamesForCustomer(config: RewardDistributionConfig, tier: string): { scratch: boolean; wheel: boolean } {
  const known = CUSTOMER_TIERS.includes(tier as CustomerTier) ? (tier as CustomerTier) : null;
  if (!known) {
    const games = CUSTOMER_TIERS.map((t) => config.tierGames[t]);
    return {
      scratch: games.some((g) => g.channel === "scratch" || g.channel === "both"),
      wheel: games.some((g) => g.channel === "wheel" || g.channel === "both"),
    };
  }
  const game = config.tierGames[known];
  return {
    scratch: game.channel === "scratch" || game.channel === "both",
    wheel: game.channel === "wheel" || game.channel === "both",
  };
}

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

function parseTierGames(raw: unknown): TierGames | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<Record<CustomerTier, Partial<TierGameConfig>>>;
  const next = {} as TierGames;
  for (const tier of CUSTOMER_TIERS) {
    const item = source[tier];
    const channel = item?.channel === "scratch" || item?.channel === "wheel" || item?.channel === "both" ? item.channel : null;
    if (!channel) return null;
    next[tier] = {
      channel,
      scratchCount: Math.max(0, Number(item?.scratchCount) || 0),
      wheelCount: Math.max(0, Number(item?.wheelCount) || 0),
    };
  }
  return next;
}

function gamesFromWeights(scratch: TierWeights, wheel: TierWeights): TierGames {
  const next = {} as TierGames;
  for (const tier of CUSTOMER_TIERS) {
    const scratchCount = Math.max(0, scratch[tier] ?? 0);
    const wheelCount = Math.max(0, wheel[tier] ?? 0);
    const channel: RewardGame =
      scratchCount > 0 && wheelCount > 0 ? "both" : wheelCount > 0 ? "wheel" : "scratch";
    next[tier] = { channel, scratchCount, wheelCount };
  }
  return next;
}

export function readRewardDistribution(orgRow: Row | undefined | null): RewardDistributionConfig {
  if (!orgRow) return applyTierGames({ ...DEFAULT_REWARD_DISTRIBUTION, tierGames: { ...DEFAULT_TIER_GAMES } });
  const customerRaw = orgRow[CHANNEL_FIELDS.customerTier];
  let embeddedGames: TierGames | null = null;
  if (typeof customerRaw === "string" && customerRaw.trim()) {
    try {
      const parsed = JSON.parse(customerRaw) as { games?: unknown };
      embeddedGames = parseTierGames(parsed?.games);
    } catch {
      embeddedGames = null;
    }
  }
  const scratch = parseWeights(orgRow[CHANNEL_FIELDS.scratch], DEFAULT_REWARD_DISTRIBUTION.scratch);
  const wheel = parseWeights(orgRow[CHANNEL_FIELDS.wheel], DEFAULT_REWARD_DISTRIBUTION.wheel);
  const tierGames = embeddedGames ?? gamesFromWeights(scratch, wheel);
  return applyTierGames({
    wheel,
    scratch,
    customerTier: parseWeights(customerRaw, DEFAULT_REWARD_DISTRIBUTION.customerTier),
    tierGames,
  });
}

export function serializeRewardDistribution(config: RewardDistributionConfig) {
  const applied = applyTierGames(config);
  return {
    [CHANNEL_FIELDS.wheel]: JSON.stringify(applied.wheel),
    [CHANNEL_FIELDS.scratch]: JSON.stringify(applied.scratch),
    [CHANNEL_FIELDS.customerTier]: JSON.stringify({
      ...normalizeTierWeights(applied.customerTier, DEFAULT_REWARD_DISTRIBUTION.customerTier),
      games: applied.tierGames,
    }),
  };
}

export function useRewardDistribution() {
  const { orgId } = useTenant();
  const { allRows, update } = useData();

  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId)),
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
