import type { EntityId } from "@/ids";
import { sameId } from "@/ids";
import type { Db, Row } from "@/store";

export const WHEEL_SEGMENTS = "wheelSegments";
export const SCRATCH_PRIZES = "scratchPrizes";
export const GUEST_PRIZE_KEY = "guestPrizeKey";

const COPY_FIELDS = [
  "orgId",
  "locationId",
  "label",
  "rewardTier",
  "prizeType",
  "prizeValue",
  "serviceId",
  "colorHex",
  "programId",
  "winWeight",
  "active",
] as const;

type PrizeStore = {
  db: Db;
  create: (collection: string, row: Row, orgOverride?: string | number) => Promise<Row | void> | Row | void;
  update: (collection: string, id: string | number, row: Row) => Promise<void> | void;
  remove: (collection: string, id: string | number) => Promise<void> | void;
};

function str(row: Row, key: string) {
  return String(row[key] ?? "").trim();
}

export function ensureGuestPrizeKey(row: Row): string {
  const existing = str(row, GUEST_PRIZE_KEY);
  if (existing) return existing;
  const label = str(row, "label").toLowerCase().replace(/\s+/g, "-") || "prize";
  return `GP-${String(row["orgId"] ?? "")}-${label}-${str(row, "prizeType")}-${str(row, "prizeValue")}-${str(row, "rewardTier")}`;
}

function fingerprint(row: Row) {
  return [
    str(row, "label").toLowerCase(),
    str(row, "prizeType"),
    str(row, "prizeValue"),
    str(row, "rewardTier"),
    str(row, "serviceId"),
  ].join("|");
}

function findTwin(pool: Row[], source: Row) {
  const key = str(source, GUEST_PRIZE_KEY);
  if (key) {
    const byKey = pool.find((r) => str(r, GUEST_PRIZE_KEY) === key);
    if (byKey) return byKey;
  }
  return pool.find((r) => sameId(r["orgId"], source["orgId"]) && fingerprint(r) === fingerprint(source)) ?? null;
}

function prizePayload(source: Row, key: string, id: string | number = 0): Row {
  const next: Row = { id, [GUEST_PRIZE_KEY]: key };
  for (const field of COPY_FIELDS) {
    next[field] = source[field] ?? "";
  }
  next.orgId = Number(source["orgId"]) || 0;
  next.locationId = Number(source["locationId"]) || 0;
  next.programId = Number(source["programId"]) || 0;
  next.prizeValue = Number(source["prizeValue"]) || 0;
  next.serviceId = Number(source["serviceId"]) || (str(source, "prizeType") === "Free service" ? Number(source["prizeValue"]) || 0 : 0);
  next.winWeight = Number(source["winWeight"] ?? 1) || 1;
  next.active = str(source, "active") || "Yes";
  return next;
}

function otherCollection(sourceCollection: string) {
  return sourceCollection === WHEEL_SEGMENTS ? SCRATCH_PRIZES : WHEEL_SEGMENTS;
}

/** Keep wheel and scratch catalogs the same when staff edit guest prizes. */
export async function syncGuestPrizeTwin(store: PrizeStore, source: Row, sourceCollection = WHEEL_SEGMENTS) {
  const key = ensureGuestPrizeKey(source);
  const target = otherCollection(sourceCollection);
  const twin = findTwin(store.db[target] ?? [], { ...source, [GUEST_PRIZE_KEY]: key });
  const payload = prizePayload(source, key, twin?.id ?? 0);
  if (twin) {
    await store.update(target, twin.id, payload);
    return;
  }
  await store.create(target, { ...payload, id: 0 });
}

export async function deleteGuestPrizeTwin(store: PrizeStore, source: Row, sourceCollection = WHEEL_SEGMENTS) {
  const target = otherCollection(sourceCollection);
  const twin = findTwin(store.db[target] ?? [], source);
  if (twin) await store.remove(target, twin.id);
}

const backfillDone = new Set<string>();

async function removeDuplicateWheels(store: PrizeStore, orgId: EntityId) {
  const wheels = (store.db[WHEEL_SEGMENTS] ?? [])
    .filter((r) => sameId(r["orgId"], orgId))
    .slice()
    .sort((a, b) => Number(a.id) - Number(b.id));
  const seen = new Set<string>();
  for (const row of wheels) {
    const fp = fingerprint(row);
    if (seen.has(fp)) await store.remove(WHEEL_SEGMENTS, row.id);
    else seen.add(fp);
  }
}

/** Copy wheel prizes onto the scratch catalog. Wheel is the one list staff edit. */
export async function backfillGuestPrizeCatalog(store: PrizeStore, orgId: EntityId) {
  const lock = String(orgId);
  if (!(WHEEL_SEGMENTS in store.db) || !(SCRATCH_PRIZES in store.db)) return;
  if (backfillDone.has(lock)) return;
  backfillDone.add(lock);
  await removeDuplicateWheels(store, orgId);
  const wheels = (store.db[WHEEL_SEGMENTS] ?? []).filter((r) => sameId(r["orgId"], orgId));
  const scratches = (store.db[SCRATCH_PRIZES] ?? []).filter((r) => sameId(r["orgId"], orgId));

  for (const row of wheels) {
    const key = ensureGuestPrizeKey(row);
    if (!findTwin(scratches, { ...row, [GUEST_PRIZE_KEY]: key })) {
      const created = await store.create(SCRATCH_PRIZES, prizePayload(row, key, 0));
      if (created) scratches.push(created);
    }
  }
}
