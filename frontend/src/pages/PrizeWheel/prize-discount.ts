import type { Db, Row } from "@/store";

export type PrizeCartLine = { id: string; name: string; price: number; qty: number };

/** Same fields as a prize-wheel slice — POS claims from this, not a second rule set. */
export type PrizeClaim = {
  prizeType: string;
  prizeValue: number;
  label: string;
  serviceId: string;
};

export function prizeClaimFromRow(row: Row, catalog?: Row | null): PrizeClaim {
  const prizeType = String(row["rewardType"] || row["prizeType"] || catalog?.["prizeType"] || "");
  const snapshot = Number(row["rewardValue"] ?? row["prizeValue"] ?? 0);
  const fromCatalog = Number(catalog?.["prizeValue"] ?? 0);
  const prizeValue = snapshot > 0 ? snapshot : fromCatalog;
  const storedService = Number(row["serviceId"] ?? catalog?.["serviceId"] ?? 0);
  const freeServiceId = prizeType === "Free service" || prizeType === "Free item" ? prizeValue : 0;
  return {
    prizeType,
    prizeValue,
    label: String(row["label"] || catalog?.["label"] || ""),
    serviceId: storedService > 0 ? String(storedService) : freeServiceId > 0 ? String(freeServiceId) : "",
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

/** Free treatment historically stored the catalog service id in prizeValue. */
export function prizeServiceId(prize: { prizeValue?: unknown; rewardValue?: unknown; serviceId?: unknown; prizeType?: unknown; rewardType?: unknown }) {
  const typed = Number(prize.serviceId ?? 0);
  if (typed > 0) return String(typed);
  const type = String(prize.prizeType ?? prize.rewardType ?? "");
  if (type !== "Free service" && type !== "Free item") return "";
  const id = Number(prize.prizeValue ?? prize.rewardValue ?? 0);
  return id > 0 ? String(id) : "";
}

export function resolvePrizeService(prize: PrizeClaim, services: Row[]) {
  const id = prize.serviceId || prizeServiceId(prize);
  if (!id) return null;
  return services.find((s) => String(s.id) === id) ?? null;
}

export function prizeDiscountAmount(
  prize: PrizeClaim | { prizeType?: unknown; prizeValue?: unknown; rewardType?: unknown; rewardValue?: unknown; label?: unknown; serviceId?: unknown },
  subtotal: number,
  cart: PrizeCartLine[] = [],
) {
  const prizeType = String(prize.prizeType ?? prize.rewardType ?? "");
  const prizeValue = Number(prize.prizeValue ?? prize.rewardValue ?? 0);
  const serviceId = prizeServiceId(prize);
  const serviceBase = serviceId
    ? cart.filter((l) => String(l.id) === serviceId).reduce((s, l) => s + l.price * l.qty, 0)
    : 0;
  if (prizeType === "Flat discount") {
    const cap = serviceId ? serviceBase : subtotal;
    return Math.min(prizeValue, cap);
  }
  if (prizeType === "Percentage discount") {
    const base = serviceId ? serviceBase : subtotal;
    return Math.round(base * (prizeValue / 100));
  }
  if (prizeType === "Free service" || prizeType === "Free item") {
    const id = prizeServiceId({ ...prize, prizeType, prizeValue });
    if (!id) return 0;
    const line = cart.find((l) => String(l.id) === id);
    return line ? Math.round(line.price * line.qty) : 0;
  }
  return 0;
}
