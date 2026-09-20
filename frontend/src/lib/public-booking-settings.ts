import { useCallback, useMemo } from "react";
import type { Db, Row } from "@/lib/store";
import { useData } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export type WalkInRewardMode = "wheel" | "scratch";

export type PublicBookingSettings = {
  showPrizeWheel: boolean;
  showScratchCard: boolean;
  /** When both games are enabled, walk-in desk uses this one (guest still sees both on public booking). */
  walkInReward: WalkInRewardMode;
};

const FIELD_PRIZE_WHEEL = "publicBookingShowPrizeWheel";
const FIELD_SCRATCH_CARD = "publicBookingShowScratchCard";
const FIELD_WALK_IN_REWARD = "walkInRewardMode";
const STORAGE_KEY = "krios-public-booking-settings";

function readAllStored(): Record<string, PublicBookingSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PublicBookingSettings>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStored(orgId: string, settings: PublicBookingSettings) {
  if (typeof window === "undefined") return;
  try {
    const all = readAllStored();
    all[orgId] = settings;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Merge saved public-booking toggles into seed org rows on app load. */
export function hydratePublicBookingSettings(db: Db): Db {
  const stored = readAllStored();
  if (!Object.keys(stored).length) return db;

  const organizations = (db.organizations ?? []).map((row) => {
    const saved = stored[String(row.orgId)];
    if (!saved) return row;
    return { ...row, ...serializePublicBookingSettings(saved) };
  });

  return { ...db, organizations };
}

function parseWalkInReward(value: string | number | undefined): WalkInRewardMode {
  return String(value ?? "wheel") === "scratch" ? "scratch" : "wheel";
}

export function resolveWalkInRewardMode(settings: PublicBookingSettings): WalkInRewardMode | null {
  if (settings.showPrizeWheel && !settings.showScratchCard) return "wheel";
  if (settings.showScratchCard && !settings.showPrizeWheel) return "scratch";
  if (settings.showPrizeWheel && settings.showScratchCard) return settings.walkInReward;
  return null;
}

export function readPublicBookingSettings(orgRow: Row | undefined | null, orgId?: string): PublicBookingSettings {
  const fromRow: PublicBookingSettings = {
    showPrizeWheel: String(orgRow?.[FIELD_PRIZE_WHEEL] ?? "Yes") !== "No",
    showScratchCard: String(orgRow?.[FIELD_SCRATCH_CARD] ?? "Yes") !== "No",
    walkInReward: parseWalkInReward(orgRow?.[FIELD_WALK_IN_REWARD]),
  };

  const id = orgId ?? (orgRow ? String(orgRow.orgId) : "");
  if (!id) return fromRow;

  const stored = readAllStored()[id];
  return stored ? { ...fromRow, ...stored } : fromRow;
}

export function serializePublicBookingSettings(settings: PublicBookingSettings) {
  return {
    [FIELD_PRIZE_WHEEL]: settings.showPrizeWheel ? "Yes" : "No",
    [FIELD_SCRATCH_CARD]: settings.showScratchCard ? "Yes" : "No",
    [FIELD_WALK_IN_REWARD]: settings.walkInReward,
  };
}

export function usePublicBookingSettings() {
  const { orgId } = useTenant();
  const { allRows, update } = useData();

  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === orgId),
    [allRows, orgId],
  );

  const settings = useMemo(() => readPublicBookingSettings(orgRow, orgId), [orgRow, orgId]);

  const save = useCallback(
    (next: PublicBookingSettings) => {
      writeStored(orgId, next);
      if (!orgRow) return;
      update("organizations", String(orgRow.id), {
        ...orgRow,
        ...serializePublicBookingSettings(next),
      });
    },
    [orgRow, orgId, update],
  );

  return { settings, save, orgRow };
}

/** Read booking feature flags for a public guest page (any org). */
export function publicBookingSettingsForOrg(allRows: Record<string, Row[]>, orgId: string): PublicBookingSettings {
  const orgRow = (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === orgId);
  return readPublicBookingSettings(orgRow, orgId);
}
