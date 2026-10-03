/**
 * Production-oriented loyalty schema (JSON prototype → future DB).
 */

export const COLLECTIONS = {
  loyaltyPrograms: "loyalty",
  loyaltyPointPrograms: "loyaltyPointPrograms",
  stampPrograms: "stampPrograms",
  wheelPrograms: "wheelPrograms",
  customerLoyalty: "customerLoyalty",
  customerStamps: "customerStamps",
  stampTransactions: "stampTransactions",
  loyaltyTransactions: "loyaltyTransactions",
  rewards: "rewards",
  customerRewards: "customerRewards",
  wheelSegments: "wheelSegments",
  wheelSpins: "wheelSpins",
  checkins: "qrCheckins",
  offers: "offers",
  offerRedemptions: "qrOfferRedemptions",
} as const;

export type ProgramType = "POINTS" | "STAMP" | "WHEEL" | "OFFER";

export type RewardType =
  | "POINTS"
  | "FIXED_DISCOUNT"
  | "PERCENT_DISCOUNT"
  | "FREE_SERVICE"
  | "FREE_ADDON"
  | "PARTNER_OFFER"
  | "TRY_AGAIN";

export type LoyaltyTxType = "Earn" | "Redeem" | "Adjust" | "Expire";

export function normalizeProgramType(type: string): ProgramType {
  const t = type.toLowerCase();
  if (t.includes("stamp")) return "STAMP";
  if (t.includes("wheel") || t.includes("spin")) return "WHEEL";
  if (t.includes("offer") || t.includes("promotional")) return "OFFER";
  return "POINTS";
}

export function normalizeRewardType(type: string): RewardType {
  const t = type.toLowerCase();
  if (t.includes("bonus") || t.includes("point")) return "POINTS";
  if (t.includes("percent")) return "PERCENT_DISCOUNT";
  if (t.includes("flat")) return "FIXED_DISCOUNT";
  if (t.includes("free service")) return "FREE_SERVICE";
  if (t.includes("free item") || t.includes("add-on")) return "FREE_ADDON";
  if (t.includes("partner")) return "PARTNER_OFFER";
  if (t.includes("no prize") || t.includes("try")) return "TRY_AGAIN";
  return "FIXED_DISCOUNT";
}
