import type { Db, Row } from "@/lib/store";
import { customerName } from "@/lib/customers/customer-lookup";
import { getRewardById } from "@/lib/loyalty/loyalty-account";
import { CUSTOMER_REWARDS } from "@/lib/rewards/customer-reward-service";

export type UnifiedCustomerReward = {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  source: string;
  status: string;
  issuedAt: string;
  expiresAt: string;
  invoiceId: string;
  refCollection: "customerRewards" | "wheelSpins";
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function mapCustomerRewardRow(db: Db, row: Row): UnifiedCustomerReward {
  const master = row["rewardId"] ? getRewardById(db, String(row["rewardId"])) : null;
  return {
    id: String(row.id),
    customerId: String(row["customerId"] ?? ""),
    customerName: customerName(db, String(row["customerId"] ?? "")),
    title: String(master?.["name"] ?? row["title"] ?? "Reward"),
    description: String(master?.["description"] ?? row["description"] ?? ""),
    source: String(row["sourceType"] ?? "loyalty"),
    status: String(row["status"] ?? "Available"),
    issuedAt: String(row["issuedAt"] ?? ""),
    expiresAt: String(row["expiresAt"] ?? ""),
    invoiceId: String(row["invoiceId"] ?? ""),
    refCollection: "customerRewards",
  };
}

function mapWheelSpinRow(db: Db, spin: Row): UnifiedCustomerReward {
  const master = spin["rewardId"] ? getRewardById(db, String(spin["rewardId"])) : null;
  const prizeType = String(spin["rewardType"] ?? "");
  if (prizeType === "Bonus points" || prizeType === "No prize") {
    return {
      id: String(spin.id),
      customerId: String(spin["customerId"] ?? ""),
      customerName: customerName(db, String(spin["customerId"] ?? "")),
      title: String(spin["label"] ?? "Wheel spin"),
      description: prizeType === "Bonus points" ? "Points added to balance" : "No prize",
      source: "wheel",
      status: String(spin["status"] ?? "Completed"),
      issuedAt: String(spin["spunAt"] ?? spin["createdAt"] ?? ""),
      expiresAt: String(spin["expiresAt"] ?? ""),
      invoiceId: String(spin["invoiceId"] ?? ""),
      refCollection: "wheelSpins",
    };
  }
  return {
    id: String(spin.id),
    customerId: String(spin["customerId"] ?? ""),
    customerName: customerName(db, String(spin["customerId"] ?? "")),
    title: String(master?.["name"] ?? spin["label"] ?? "Wheel prize"),
    description: String(master?.["description"] ?? "Prize wheel"),
    source: "wheel",
    status: String(spin["status"]) === "Redeemed" ? "Redeemed" : "Available",
    issuedAt: String(spin["spunAt"] ?? spin["createdAt"] ?? ""),
    expiresAt: String(spin["expiresAt"] ?? ""),
    invoiceId: String(spin["invoiceId"] ?? ""),
    refCollection: "wheelSpins",
  };
}

/** One list for admin + wallet: customerRewards first, then wheel spins not yet mirrored. */
export function listUnifiedCustomerRewards(db: Db, customerId?: string) {
  const rewards = (db[CUSTOMER_REWARDS] ?? []).filter((r) => {
    if (customerId && String(r["customerId"]) !== customerId) return false;
    return true;
  });
  const rewardSourceIds = new Set(
    rewards.filter((r) => String(r["sourceType"]) === "wheel").map((r) => String(r["sourceId"])),
  );

  const orphanSpins = (db["wheelSpins"] ?? []).filter((s) => {
    if (customerId && String(s["customerId"]) !== customerId) return false;
    if (rewardSourceIds.has(String(s.id))) return false;
    const type = String(s["rewardType"] ?? "");
    return type !== "Bonus points" && type !== "No prize" && String(s["status"]) === "Pending";
  });

  const rows: UnifiedCustomerReward[] = [
    ...rewards.map((r) => mapCustomerRewardRow(db, r)),
    ...orphanSpins.map((s) => mapWheelSpinRow(db, s)),
  ];

  return rows.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export function listAvailableUnifiedRewards(db: Db, customerId: string) {
  const day = today();
  return listUnifiedCustomerRewards(db, customerId).filter((r) => {
    if (r.status !== "Available") return false;
    if (r.expiresAt && r.expiresAt < day) return false;
    return true;
  });
}
