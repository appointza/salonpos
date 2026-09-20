import { useMemo } from "react";
import { useData, type Db, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export const REFERENCE_VALUES = "referenceValues";
const LEGACY_REFERENCE_VALUES = "referencevales";

export const REFERENCE_TYPES = {
  BUSINESS_CATEGORY: "BUSINESS_CATEGORY",
  PRIZE_LABEL: "PRIZE_LABEL",
  CUSTOMER_TIER: "CUSTOMER_TIER",
} as const;

export type ReferenceType = (typeof REFERENCE_TYPES)[keyof typeof REFERENCE_TYPES];

export function referenceRows(db: Db): Row[] {
  return db[REFERENCE_VALUES] ?? db[LEGACY_REFERENCE_VALUES] ?? [];
}

/** Options for select dropdowns — uses reference value name as label and value as stored value. */
export function referenceOptions(
  db: Db,
  referenceType: string,
  orgId?: string,
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];

  for (const row of referenceRows(db)) {
    if (String(row["referenceType"] ?? "") !== referenceType) continue;
    if (String(row["status"] ?? "Active") === "Inactive") continue;
    const rowOrg = String(row["orgId"] ?? "");
    if (orgId && rowOrg && rowOrg !== orgId) continue;

    const value = String(row["value"] ?? row["name"] ?? "").trim();
    const label = String(row["name"] ?? row["value"] ?? "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function useReferenceOptions(referenceType: string, orgScoped = true) {
  const { allRows } = useData();
  const { orgId } = useTenant();
  return useMemo(
    () => referenceOptions(allRows, referenceType, orgScoped ? orgId : undefined),
    [allRows, referenceType, orgScoped, orgId],
  );
}
