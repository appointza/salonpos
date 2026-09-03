import { useCallback, useMemo } from "react";
import { useTenant } from "@/lib/tenant";
import { useData } from "@/lib/store";
import {
  earnPoints,
  pointsToRupees,
  resolveLoyaltyRule,
  type LoyaltyRule,
} from "@/lib/loyalty-rules";

export type LoyaltySettings = LoyaltyRule;

export { earnPoints, pointsToRupees };

export const defaultLoyaltySettings = (): LoyaltyRule => ({
  programId: "",
  name: "Organisation default",
  earnUnitRupees: 100,
  pointsPerUnit: 1,
  rupeesPerPoint: 1,
  minSpend: 500,
  expiryMonths: 12,
});

export function useLoyaltySettings() {
  const { orgId, locationId } = useTenant();
  const { allRows, update } = useData();

  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === orgId),
    [allRows, orgId],
  );
  const programs = useMemo(
    () => (allRows["loyalty"] ?? []).filter((p) => String(p["orgId"]) === orgId),
    [allRows, orgId],
  );

  const settings = useMemo(
    () => resolveLoyaltyRule(programs, orgRow, { locationId: locationId === "all" ? "" : locationId }),
    [programs, orgRow, locationId],
  );

  const save = useCallback(
    (next: LoyaltyRule) => {
      const program = programs.find((p) => String(p.id) === settings.programId) ?? programs.find((p) => String(p["type"]) === "Points");
      const cleaned = {
        earnUnitRupees: Math.max(1, Number(next.earnUnitRupees) || 100),
        pointsPerUnit: Math.max(1, Number(next.pointsPerUnit) || 1),
        rupeesPerPoint: Math.max(0, Number(next.rupeesPerPoint) || 0),
        minSpend: Math.max(0, Number(next.minSpend) || 0),
        earnRate: `${Math.max(1, Number(next.pointsPerUnit) || 1)} pt / ₹${Math.max(1, Number(next.earnUnitRupees) || 100)}`,
        redeemValue: `1 pt = ₹${Math.max(0, Number(next.rupeesPerPoint) || 0)}`,
      };
      if (program) update("loyalty", String(program.id), { ...program, ...cleaned });
      else if (orgRow) update("organizations", String(orgRow.id), { id: orgRow.id, ...cleaned });
    },
    [programs, settings.programId, orgRow, update],
  );

  return { settings, save };
}
