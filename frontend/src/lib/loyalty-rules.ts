import type { EntityId } from "@/lib/ids";
import type { Row } from "@/lib/store";

export type LoyaltyRule = {
  programId: string;
  name: string;
  /** Spend this many rupees to earn `pointsPerUnit` points. Glow Rewards: 100. */
  earnUnitRupees: number;
  pointsPerUnit: number;
  rupeesPerPoint: number;
  minSpend: number;
  expiryMonths: number;
};

export function parseEarnUnit(earnRate: string) {
  const m = earnRate.match(/₹\s*(\d+)/i) || earnRate.match(/\/\s*(\d+)/);
  return m ? Number(m[1]) : 0;
}

export function parseRupeesPerPoint(redeemValue: string) {
  const m = redeemValue.match(/₹\s*([\d.]+)/);
  if (m) return Number(m[1]);
  if (/1\s*pt\s*=\s*₹\s*1/i.test(redeemValue) || /1 pt = ₹1/i.test(redeemValue)) return 1;
  return 0;
}

/** Active Points program wins over organisation defaults. */
export function resolveLoyaltyRule(
  programs: Row[],
  org: Row | undefined,
  opts: { locationId?: EntityId; tier?: string } = {},
): LoyaltyRule {
  const pointsPrograms = programs.filter(
    (p) => String(p["type"]) === "Points" && String(p["status"] ?? "Active") === "Active",
  );
  const loc = opts.locationId ?? "";
  const tier = opts.tier ?? "All";
  const ranked = [...pointsPrograms].sort((a, b) => {
    const score = (p: Row) => {
      let s = 0;
      if (loc && String(p["locationId"]) === loc) s += 2;
      const pt = String(p["tier"] ?? "All");
      if (pt !== "All" && pt === tier) s += 1;
      return s;
    };
    return score(b) - score(a);
  });
  const program = ranked[0];
  if (program) {
    const earnUnitRupees = Number(program["earnUnitRupees"]) || parseEarnUnit(String(program["earnRate"] ?? "")) || 100;
    const pointsPerUnit = Number(program["pointsPerUnit"]) || 1;
    const rupeesPerPoint =
      Number(program["rupeesPerPoint"]) || parseRupeesPerPoint(String(program["redeemValue"] ?? "")) || 1;
    return {
      programId: String(program.id),
      name: String(program["name"] ?? "Loyalty"),
      earnUnitRupees,
      pointsPerUnit,
      rupeesPerPoint,
      minSpend: Number(program["minSpend"] ?? 0),
      expiryMonths: Number(program["expiryMonths"] ?? 12),
    };
  }
  const earnUnitRupees = Number(org?.["earnUnitRupees"]) || 100;
  const pointsPerUnit = Number(org?.["pointsPerUnit"]) || 1;
  return {
    programId: "",
    name: "Organisation default",
    earnUnitRupees,
    pointsPerUnit,
    rupeesPerPoint: Number(org?.["rupeesPerPoint"]) || 1,
    minSpend: Number(org?.["loyaltyMinSpend"] ?? 0),
    expiryMonths: 12,
  };
}

export function earnPoints(eligibleSpend: number, rule: LoyaltyRule) {
  if (!Number.isFinite(eligibleSpend) || eligibleSpend < Number(rule.minSpend ?? 0)) return 0;
  const unit = Number(rule.earnUnitRupees);
  const per = Number(rule.pointsPerUnit);
  if (unit <= 0 || per <= 0) return 0;
  return Math.max(0, Math.floor(eligibleSpend / unit) * per);
}

export function pointsToRupees(points: number, rule: LoyaltyRule) {
  const rate = Number(rule.rupeesPerPoint);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.max(0, points * rate);
}

export function addExpiry(isoDate: string, months: number) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setMonth(d.getMonth() + Math.max(0, months));
  return d.toISOString().slice(0, 10);
}
