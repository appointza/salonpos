import type { Db, Row } from "@/store";

export type PrizeCartLine = { id: string; name: string; price: number; qty: number };

/** Same fields as a prize-wheel slice — POS claims from this, not a second rule set. */
export type PrizeClaim = {
  prizeType: string;
  prizeValue: number;
  label: string;
};

export function prizeClaimFromRow(row: Row, catalog?: Row | null): PrizeClaim {
  const prizeType = String(row["rewardType"] || row["prizeType"] || catalog?.["prizeType"] || "");
  const snapshot = Number(row["rewardValue"] ?? row["prizeValue"] ?? 0);
  const fromCatalog = Number(catalog?.["prizeValue"] ?? 0);
  return {
    prizeType,
    prizeValue: snapshot > 0 ? snapshot : fromCatalog,
    label: String(row["label"] || catalog?.["label"] || ""),
  };
}

export function hydrateWheelPrize(db: Db, spin: Row): PrizeClaim {
  const sid = String(spin["segmentId"] ?? "");
  const catalog = sid ? (db["wheelSegments"] ?? []).find((s) => String(s.id) === sid) ?? null : null;
  return prizeClaimFromRow(spin, catalog);
}

export function hydrateScratchPrize(db: Db, play: Row): PrizeClaim {
  const pid = String(play["prizeId"] ?? "");
  const catalog = pid ? (db["scratchPrizes"] ?? []).find((s) => String(s.id) === pid) ?? null : null;
  return prizeClaimFromRow(play, catalog);
}

/** Free treatment is always a catalog service id stored in prizeValue. */
export function prizeServiceId(prize: { prizeValue?: unknown; rewardValue?: unknown }) {
  const id = Number(prize.prizeValue ?? prize.rewardValue ?? 0);
  return id > 0 ? String(id) : "";
}

export function resolvePrizeService(prize: PrizeClaim, services: Row[]) {
  if (prize.prizeType !== "Free service" && prize.prizeType !== "Free item") return null;
  const id = prizeServiceId(prize);
  if (!id) return null;
  return services.find((s) => String(s.id) === id) ?? null;
}

export function prizeDiscountAmount(
  prize: PrizeClaim | { prizeType?: unknown; prizeValue?: unknown; rewardType?: unknown; rewardValue?: unknown; label?: unknown },
  subtotal: number,
  cart: PrizeCartLine[] = [],
) {
  const prizeType = String(prize.prizeType ?? prize.rewardType ?? "");
  const prizeValue = Number(prize.prizeValue ?? prize.rewardValue ?? 0);
  if (prizeType === "Flat discount") return Math.min(prizeValue, subtotal);
  if (prizeType === "Percentage discount") return Math.round(subtotal * (prizeValue / 100));
  if (prizeType === "Free service" || prizeType === "Free item") {
    const id = prizeServiceId({ prizeValue });
    if (!id) return 0;
    const line = cart.find((l) => String(l.id) === id);
    return line ? Math.round(line.price * line.qty) : 0;
  }
  return 0;
}
