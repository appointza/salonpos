import type { Db, Row } from "@/lib/store";
import { getCustomerById } from "@/lib/customers/customer-lookup";
import { getCustomerLoyaltyBalance } from "@/lib/loyalty/loyalty-service";
import { programOfType } from "@/lib/qr-loyalty";
import { canCustomerSpin, getTodayWheelSpin } from "@/lib/wheel/wheel-service";
import { CUSTOMER_REWARDS } from "@/lib/rewards/customer-reward-service";

export type WalletReward = {
  id: string;
  title: string;
  description: string;
  valueLabel: string;
  source: "wheel" | "offer" | "stamp" | "partner" | "points";
  status: "Available" | "Redeemed" | "Expired";
  expiresAt: string;
  refCollection: string;
  refId: string;
};

export type WalletActivity = {
  id: string;
  label: string;
  detail: string;
  date: string;
  kind: "points" | "visit" | "wheel" | "offer" | "stamp" | "reward";
};

export type CustomerWallet = {
  customer: Row;
  points: number;
  tier: string;
  visits: number;
  stampsCurrent: number;
  stampsRequired: number;
  spinAvailable: boolean;
  spinBlockedReason: string;
  todaySpinLabel: string;
  availableRewards: WalletReward[];
  usedRewards: WalletReward[];
  expiredRewards: WalletReward[];
  activity: WalletActivity[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function rewardValueLabel(type: string, value: number, title: string) {
  if (type === "Bonus points" && value > 0) return `+${value} pts`;
  if (type === "Percentage discount" && value > 0) return `${value}% off`;
  if (type === "Flat discount" && value > 0) return `₹${value} off`;
  if (type === "Free service" || type === "Free item") return title || "Free reward";
  return title || "Reward";
}

function mapWheelReward(spin: Row): WalletReward {
  const type = String(spin["rewardType"] ?? "");
  const value = Number(spin["rewardValue"] ?? 0);
  const label = String(spin["label"] ?? "Wheel prize");
  return {
    id: String(spin.id),
    title: label,
    description: "Prize wheel",
    valueLabel: rewardValueLabel(type, value, label),
    source: "wheel",
    status: String(spin["status"]) === "Redeemed" ? "Redeemed" : "Available",
    expiresAt: String(spin["expiresAt"] ?? ""),
    refCollection: "wheelSpins",
    refId: String(spin.id),
  };
}

function mapOfferReward(row: Row): WalletReward {
  return {
    id: String(row.id),
    title: String(row["offerTitle"] ?? row["offerId"] ?? "Offer"),
    description: String(row["offerType"] ?? "Promotion"),
    valueLabel: String(row["offerType"] ?? "Discount"),
    source: "offer",
    status: String(row["status"]) === "Redeemed" ? "Redeemed" : "Available",
    expiresAt: String(row["expiresAt"] ?? ""),
    refCollection: "qrOfferRedemptions",
    refId: String(row.id),
  };
}

function mapStampReward(row: Row): WalletReward {
  return {
    id: String(row.id),
    title: String(row["title"] ?? "Stamp reward"),
    description: String(row["description"] ?? "Stamp card"),
    valueLabel: String(row["rewardType"] ?? "Free service"),
    source: "stamp",
    status:
      String(row["status"]) === "Redeemed"
        ? "Redeemed"
        : String(row["expiresAt"] ?? "") && String(row["expiresAt"]) < today()
          ? "Expired"
          : "Available",
    expiresAt: String(row["expiresAt"] ?? ""),
    refCollection: CUSTOMER_REWARDS,
    refId: String(row.id),
  };
}

function mapPartnerReward(row: Row): WalletReward {
  return {
    id: String(row.id),
    title: String(row["offer"] ?? row["couponCode"] ?? "Partner coupon"),
    description: String(row["direction"] ?? "Partner"),
    valueLabel: "Partner offer",
    source: "partner",
    status: String(row["status"]) === "Redeemed" ? "Redeemed" : "Available",
    expiresAt: String(row["expiresAt"] ?? ""),
    refCollection: "partnerCoupons",
    refId: String(row.id),
  };
}

export function buildCustomerWallet(
  db: Db,
  customerId: string,
  programs: Row[],
  locationId: string,
  checkinId?: string,
): CustomerWallet | null {
  const customer = getCustomerById(db, customerId);
  if (!customer) return null;

  const stampProgram = programOfType(programs, "Stamp Card");
  const wheelProgram = programOfType(programs, "Spin the Wheel");
  const stampsRequired = Math.max(1, Number(stampProgram?.["stampsRequired"] ?? 8));
  const spinCheck = canCustomerSpin(db, customerId, wheelProgram, checkinId);

  const wheelSpins = (db["wheelSpins"] ?? []).filter((s) => String(s["customerId"]) === customerId);
  const offers = (db["qrOfferRedemptions"] ?? []).filter((r) => String(r["customerId"]) === customerId);
  const stamps = (db[CUSTOMER_REWARDS] ?? []).filter(
    (r) => String(r["customerId"]) === customerId && String(r["sourceType"]) === "stamp",
  );
  const partners = (db["partnerCoupons"] ?? []).filter((c) => String(c["customerId"]) === customerId);
  const txs = (db["loyaltyTransactions"] ?? []).filter((t) => String(t["customerId"]) === customerId);
  const checkins = (db["qrCheckins"] ?? []).filter((c) => String(c["customerId"]) === customerId);

  const allRewards: WalletReward[] = [
    ...wheelSpins.map(mapWheelReward),
    ...offers.map(mapOfferReward),
    ...stamps.map(mapStampReward),
    ...partners.map(mapPartnerReward),
  ];

  const availableRewards = allRewards.filter((r) => r.status === "Available");
  const usedRewards = allRewards.filter((r) => r.status === "Redeemed");
  const expiredRewards = allRewards.filter((r) => r.status === "Expired");

  const activity: WalletActivity[] = [];
  for (const t of txs.slice(0, 8)) {
    const pts = Number(t["points"] ?? 0);
    activity.push({
      id: String(t.id),
      label: `${String(t["type"]) === "Redeem" ? "−" : "+"}${pts} points`,
      detail: String(t["reason"] ?? t["source"] ?? ""),
      date: String(t["createdAt"] ?? t["createdon"] ?? ""),
      kind: "points",
    });
  }
  for (const s of wheelSpins.slice(0, 5)) {
    activity.push({
      id: `ws-${String(s.id)}`,
      label: String(s["label"] ?? "Wheel spin"),
      detail: String(s["rewardType"] ?? ""),
      date: String(s["createdAt"] ?? ""),
      kind: "wheel",
    });
  }
  for (const c of checkins.slice(0, 5)) {
    activity.push({
      id: `ck-${String(c.id)}`,
      label: "Visit check-in",
      detail: String(c["rewardEarned"] ?? ""),
      date: String(c["visitAt"] ?? "").slice(0, 10),
      kind: "visit",
    });
  }
  activity.sort((a, b) => b.date.localeCompare(a.date));

  const todaySpin = getTodayWheelSpin(db, customerId);

  return {
    customer,
    points: getCustomerLoyaltyBalance(db, customerId),
    tier: String(customer["tier"] ?? "Silver"),
    visits: Number(customer["totalVisits"] ?? customer["visits"] ?? 0),
    stampsCurrent: Number(customer["stampsCurrent"] ?? 0),
    stampsRequired,
    spinAvailable: spinCheck.ok,
    spinBlockedReason: spinCheck.reason ?? "",
    todaySpinLabel: String(todaySpin?.["label"] ?? customer["lastWheelPrize"] ?? ""),
    availableRewards,
    usedRewards,
    expiredRewards,
    activity: activity.slice(0, 12),
  };
}
