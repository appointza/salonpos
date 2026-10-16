import type { EntityId } from "@/ids";
import type { Row } from "@/store";

export const GROWTH_CLAIM_ALLOTMENT = 500;
const STORAGE_KEY = "krios-growth-claim-pool";

export type GrowthClaimPool = {
  remaining: number;
  claimedTotal: number;
  lastClaimAt: string;
};

export function emptyGrowthClaimPool(): GrowthClaimPool {
  return { remaining: 0, claimedTotal: 0, lastClaimAt: "" };
}

export function orgIsGrowthPackage(orgRow?: Row | null, fallbackPlan?: string) {
  const plan = String(orgRow?.["plan"] ?? fallbackPlan ?? "Growth").trim() || "Growth";
  return plan.toLowerCase() === "growth";
}

function readStoredAll(): Record<string, GrowthClaimPool> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, GrowthClaimPool>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function parseGrowthClaimPool(raw: unknown): GrowthClaimPool | null {
  if (raw == null || raw === "") return null;
  let data: Partial<GrowthClaimPool> | null = null;
  if (typeof raw === "object") data = raw as Partial<GrowthClaimPool>;
  else if (typeof raw === "string") {
    try {
      data = JSON.parse(raw) as Partial<GrowthClaimPool>;
    } catch {
      return null;
    }
  }
  if (!data) return null;
  return {
    remaining: Math.max(0, Math.floor(Number(data.remaining) || 0)),
    claimedTotal: Math.max(0, Math.floor(Number(data.claimedTotal) || 0)),
    lastClaimAt: String(data.lastClaimAt ?? ""),
  };
}

export function readGrowthClaimPool(orgRow: Row | null | undefined, orgId: EntityId): GrowthClaimPool {
  const fromRow = parseGrowthClaimPool(orgRow?.["growthClaimPool"]);
  const stored = readStoredAll()[String(orgId)];
  if (fromRow && stored) {
    return fromRow.claimedTotal >= stored.claimedTotal ? fromRow : stored;
  }
  return fromRow ?? stored ?? emptyGrowthClaimPool();
}

export function writeGrowthClaimPool(orgId: EntityId, pool: GrowthClaimPool) {
  if (typeof window === "undefined") return;
  try {
    const all = readStoredAll();
    all[String(orgId)] = pool;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function claimGrowthAllotment(pool: GrowthClaimPool): GrowthClaimPool {
  const today = new Date().toISOString().slice(0, 10);
  return {
    remaining: pool.remaining + GROWTH_CLAIM_ALLOTMENT,
    claimedTotal: pool.claimedTotal + GROWTH_CLAIM_ALLOTMENT,
    lastClaimAt: today,
  };
}

export function spendGrowthClaim(pool: GrowthClaimPool, points: number): GrowthClaimPool | null {
  const pts = Math.max(0, Math.floor(points));
  if (pts <= 0 || pts > pool.remaining) return null;
  return { ...pool, remaining: pool.remaining - pts };
}

/** Points this offer/prize should add to the same POS wallet. */
export function pointsFromStoreOffer(row: Row, rupeesPerPoint = 1): number {
  const type = String(row["rewardType"] ?? row["offerType"] ?? "");
  const value = Number(row["rewardValue"] ?? row["value"] ?? 0);
  const text = [
    row["title"],
    row["label"],
    row["offerTitle"],
    row["description"],
    row["valueLabel"],
  ]
    .map((v) => String(v ?? ""))
    .join(" ");
  if (type === "Bonus points" || /point/i.test(type)) {
    if (value > 0) return Math.floor(value);
    const m = text.match(/(\d+)\s*(pts|points)/i);
    return m ? Number(m[1]) : 0;
  }
  const ptsMatch = text.match(/(\d+)\s*(pts|points)/i);
  if (ptsMatch) return Number(ptsMatch[1]);
  if ((type === "Flat off" || type === "Flat discount") && rupeesPerPoint > 0) {
    const rupee = value > 0 ? value : Number(text.match(/₹\s*(\d+)/)?.[1] ?? 0);
    if (rupee > 0) return Math.floor(rupee / rupeesPerPoint);
  }
  return 0;
}
