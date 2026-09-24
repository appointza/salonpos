import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { rowToEntity, toRow } from "@/lib/entity-row";
import {
  earnPoints,
  pointsToRupees,
  resolveLoyaltyRule,
  type LoyaltyRule,
} from "@/lib/loyalty-rules";
import { useTenant } from "@/lib/tenant";
import { useData } from "@/lib/store";
import { loyaltyService } from "@/services/loyalty.service";

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
  const { allRows, update, applyCache } = useData();

  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId)),
    [allRows, orgId],
  );
  const programs = useMemo(
    () => (allRows["loyalty"] ?? []).filter((p) => String(p["orgId"]) === String(orgId)),
    [allRows, orgId],
  );

  const settings = useMemo(
    () => resolveLoyaltyRule(programs, orgRow, { locationId: locationId === "all" ? "" : locationId }),
    [programs, orgRow, locationId],
  );

  const save = useCallback(
    async (next: LoyaltyRule) => {
      const program = programs.find((p) => String(p.id) === settings.programId) ?? programs.find((p) => String(p["type"]) === "Points");
      const cleaned = {
        earnUnitRupees: Math.max(1, Number(next.earnUnitRupees) || 100),
        pointsPerUnit: Math.max(1, Number(next.pointsPerUnit) || 1),
        rupeesPerPoint: Math.max(0, Number(next.rupeesPerPoint) || 0),
        minSpend: Math.max(0, Number(next.minSpend) || 0),
        expiryMonths: Math.max(0, Number(next.expiryMonths) || 12),
        earnRate: `${Math.max(1, Number(next.pointsPerUnit) || 1)} pt / ₹${Math.max(1, Number(next.earnUnitRupees) || 100)}`,
        redeemValue: `1 pt = ₹${Math.max(0, Number(next.rupeesPerPoint) || 0)}`,
      };

      try {
        if (program) {
          const saved = await loyaltyService.save(
            rowToEntity({
              ...program,
              ...cleaned,
              orgId,
              type: "Points",
              status: "Active",
            }),
          );
          const row = toRow(saved as Record<string, unknown>);
          applyCache((prev) => ({
            ...prev,
            loyalty: (prev["loyalty"] ?? []).map((r) => (String(r.id) === String(row.id) ? row : r)),
          }));
        } else {
          const saved = await loyaltyService.save(
            rowToEntity({
              id: 0,
              orgId,
              locationId: locationId === "all" ? 0 : Number(locationId) || 0,
              name: "Points program",
              type: "Points",
              tier: "All",
              status: "Active",
              qrEnabled: "No",
              ...cleaned,
            }),
          );
          const row = toRow(saved as Record<string, unknown>);
          applyCache((prev) => ({
            ...prev,
            loyalty: [row, ...(prev["loyalty"] ?? [])],
          }));
        }
        toast.success("Loyalty settings saved to server");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save loyalty settings");
        throw e;
      }
    },
    [programs, settings.programId, orgId, locationId, applyCache],
  );

  return { settings, save, isConfigured: Boolean(settings.programId || programs.length) };
}
