import { useCallback, useMemo } from "react";
import type { EntityId } from "@/ids";
import type { Db, Row } from "@/store";
import { useData } from "@/store";
import { useTenant } from "@/tenant";

export type ReferralRewardType = "points" | "percentage" | "flat" | "free-service";

export type ReferralRules = {
  enabled: boolean;
  rewardType: ReferralRewardType;
  rewardValue: number;
  serviceId: number;
  rewardNewGuest: boolean;
};

const STORAGE_KEY = "krios-referral-rules";

export function defaultReferralRules(): ReferralRules {
  return {
    enabled: true,
    rewardType: "percentage",
    rewardValue: 10,
    serviceId: 0,
    rewardNewGuest: false,
  };
}

function readAllStored(): Record<string, ReferralRules> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ReferralRules>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStored(orgId: EntityId, rules: ReferralRules) {
  if (typeof window === "undefined") return;
  try {
    const all = readAllStored();
    all[String(orgId)] = rules;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function normalizeReferralRules(next: Partial<ReferralRules> | null | undefined): ReferralRules {
  const base = defaultReferralRules();
  const type = next?.rewardType;
  const rewardType: ReferralRewardType =
    type === "points" || type === "percentage" || type === "flat" || type === "free-service" ? type : base.rewardType;
  return {
    enabled: next?.enabled !== false,
    rewardType,
    rewardValue: Math.max(0, Number(next?.rewardValue) || (rewardType === "points" ? 50 : rewardType === "flat" ? 100 : 10)),
    serviceId: Math.max(0, Number(next?.serviceId) || 0),
    rewardNewGuest: next?.rewardNewGuest === true,
  };
}

function referralRulesJson(raw: unknown): Partial<ReferralRules> | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") return raw as Partial<ReferralRules>;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Partial<ReferralRules>) : null;
  } catch {
    return null;
  }
}

export function parseReferralRules(raw: unknown): ReferralRules | null {
  const data = referralRulesJson(raw);
  if (!data) return null;
  return normalizeReferralRules(data);
}

export function readReferralRules(orgRow: Row | undefined | null, orgId?: EntityId): ReferralRules {
  const fromRow = parseReferralRules(orgRow?.["referralRules"]);
  const id = String(orgId ?? orgRow?.["orgId"] ?? "");
  const stored = id ? readAllStored()[id] : undefined;
  return normalizeReferralRules(stored ?? fromRow ?? defaultReferralRules());
}

export function hydrateReferralRules(db: Db): Db {
  const stored = readAllStored();
  if (!Object.keys(stored).length) return db;
  const organizations = (db.organizations ?? []).map((row) => {
    const saved = stored[String(row.orgId)];
    if (!saved) return row;
    return { ...row, referralRules: JSON.stringify(saved) };
  });
  return { ...db, organizations };
}

export function referralRewardLabel(rules: ReferralRules, services: Row[] = []) {
  if (rules.rewardType === "points") return `${rules.rewardValue} loyalty points`;
  if (rules.rewardType === "percentage") return `${rules.rewardValue}% off`;
  if (rules.rewardType === "flat") return `₹${rules.rewardValue} off`;
  const service = services.find((s) => String(s.id) === String(rules.serviceId));
  return service ? `Free ${String(service["name"])}` : "Free service";
}

/** Customer-facing earn copy. Null when the salon has no referral program. */
export function referrerEarnSummary(orgRow: Row | null | undefined, services: Row[] = []): string | null {
  const data = referralRulesJson(orgRow?.["referralRules"]);
  if (!data || data.enabled === false) return null;
  const hasReward =
    data.enabled === true ||
    data.rewardType != null ||
    data.rewardValue != null ||
    (data.serviceId != null && Number(data.serviceId) > 0);
  if (!hasReward) return null;
  const parsed = normalizeReferralRules(data);
  if (parsed.rewardType === "points" && parsed.rewardValue <= 0) return null;
  if ((parsed.rewardType === "percentage" || parsed.rewardType === "flat") && parsed.rewardValue <= 0) return null;
  return `You get ${referralRewardLabel(parsed, services)} when a new guest books their first service with your link.`;
}

export function useReferralRules() {
  const { orgId } = useTenant();
  const { allRows, applyCache, update } = useData();
  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId)),
    [allRows, orgId],
  );
  const rules = useMemo(() => readReferralRules(orgRow, orgId), [orgRow, orgId]);

  const save = useCallback(
    (next: ReferralRules) => {
      const cleaned = normalizeReferralRules(next);
      writeStored(orgId, cleaned);
      applyCache((prev) => ({
        ...prev,
        organizations: (prev["organizations"] ?? []).map((row) =>
          String(row["orgId"]) === String(orgId) ? { ...row, referralRules: JSON.stringify(cleaned) } : row,
        ),
      }));
      if (orgRow) {
        void update("organizations", String(orgRow.id), {
          ...orgRow,
          referralRules: JSON.stringify(cleaned),
        });
      }
    },
    [applyCache, orgId, orgRow, update],
  );

  return { rules, save, orgRow };
}
