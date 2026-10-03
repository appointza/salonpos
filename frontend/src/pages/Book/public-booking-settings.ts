import type { EntityId } from "@/ids";
import { useCallback, useMemo } from "react";
import type { Db, Row } from "@/store";
import { useData } from "@/store";
import { useTenant } from "@/tenant";

export type WalkInRewardMode = "wheel" | "scratch";

export type PublicBookingSettings = {
  showPrizeWheel: boolean;
  showScratchCard: boolean;
  /** The single game guests play on public booking and walk-in. */
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

function writeStored(orgId: EntityId, settings: PublicBookingSettings) {
  if (typeof window === "undefined") return;
  try {
    const all = readAllStored();
    all[orgId] = settings;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Merge saved public-booking toggles into organization rows after API load. */
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
  if (!settings.showPrizeWheel && !settings.showScratchCard) return null;
  if (settings.showPrizeWheel && !settings.showScratchCard) return "wheel";
  if (settings.showScratchCard && !settings.showPrizeWheel) return "scratch";
  return settings.walkInReward === "scratch" ? "scratch" : "wheel";
}

/** Exactly one guest game (or none) — used by public booking and walk-in. */
export function guestRewardGames(settings: PublicBookingSettings): { scratch: boolean; wheel: boolean } {
  const mode = resolveWalkInRewardMode(settings);
  return {
    scratch: mode === "scratch",
    wheel: mode === "wheel",
  };
}

function parseYesNo(raw: unknown, fallback: boolean): boolean {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "yes") return true;
  if (s === "no") return false;
  return fallback;
}

export function readPublicBookingSettings(orgRow: Row | undefined | null, orgId?: EntityId): PublicBookingSettings {
  const id = orgId ?? (orgRow ? String(orgRow["orgId"]) : "");
  const stored = id ? readAllStored()[String(id)] : undefined;
  return {
    showPrizeWheel: parseYesNo(orgRow?.[FIELD_PRIZE_WHEEL], stored?.showPrizeWheel ?? true),
    showScratchCard: parseYesNo(orgRow?.[FIELD_SCRATCH_CARD], stored?.showScratchCard ?? true),
    walkInReward: parseWalkInReward(orgRow?.[FIELD_WALK_IN_REWARD] || stored?.walkInReward),
  };
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
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId)),
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
export function publicBookingSettingsForOrg(allRows: Record<string, Row[]>, orgId: EntityId): PublicBookingSettings {
  const orgRow = (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId));
  return readPublicBookingSettings(orgRow, orgId);
}
