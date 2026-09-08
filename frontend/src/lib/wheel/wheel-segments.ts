import type { Db, Row } from "@/lib/store";
import { getRewardById } from "@/lib/loyalty/loyalty-account";
import { WHEEL_SEGMENTS } from "@/lib/qr-loyalty";

function rewardTypeToPrizeType(type: string) {
  const t = type.toUpperCase();
  if (t === "POINTS") return "Bonus points";
  if (t === "PERCENT_DISCOUNT") return "Percentage discount";
  if (t === "FIXED_DISCOUNT") return "Flat discount";
  if (t === "FREE_SERVICE" || t === "FREE_ADDON") return "Free service";
  if (t === "TRY_AGAIN") return "No prize";
  return "Flat discount";
}

/** Wheel slice labels/values come from the rewards catalog when rewardId is set. */
export function enrichWheelSegments(db: Db, segments: Row[]) {
  return segments.map((segment) => {
    const rewardId = String(segment["rewardId"] ?? "");
    if (!rewardId) return segment;
    const reward = getRewardById(db, rewardId);
    if (!reward) return segment;
    const type = String(reward["type"] ?? "");
    return {
      ...segment,
      label: String(reward["name"] ?? segment["label"] ?? ""),
      prizeType: rewardTypeToPrizeType(type),
      prizeValue: Number(
        reward["discountValue"] ?? reward["points"] ?? segment["prizeValue"] ?? 0,
      ),
    };
  });
}

export function getWheelSegmentsForOutlet(db: Db, orgId: string, locationId: string) {
  const all = (db[WHEEL_SEGMENTS] ?? []).filter((s) => String(s["orgId"]) === orgId);
  const here = all.filter((s) => String(s["locationId"]) === locationId);
  const segments = here.length ? here : all;
  return enrichWheelSegments(db, segments);
}
