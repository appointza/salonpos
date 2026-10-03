import { CrudPage, type ModuleDef } from "@/components/CrudPage";

const module: ModuleDef = {
  key: "loyalty",
  title: "Loyalty Programs",
  subtitle: "Points, family offers and QR scan-to-earn campaigns.",
  idPrefix: "LY-",
  fields: [
    { name: "name", label: "Program name", table: true },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: ["Points", "Stamp Card", "Spin the Wheel", "Tiered", "Family Offer", "Promotional QR", "Wallet"],
      table: true,
      badge: true,
    },
    { name: "earnRate", label: "Earn rate (display)", table: true },
    { name: "redeemValue", label: "Redemption value (display)", table: true },
    { name: "earnUnitRupees", label: "₹ per earn unit", type: "number" },
    { name: "pointsPerUnit", label: "Points per unit", type: "number" },
    { name: "rupeesPerPoint", label: "₹ per point (redeem)", type: "number" },
    { name: "tier", label: "Applies to tier", type: "select", options: ["All", "Bronze", "Silver", "Gold", "Platinum"] },
    { name: "minSpend", label: "Min spend", type: "number", money: true },
    { name: "expiryMonths", label: "Points expiry (months)", type: "number" },
    { name: "stampsRequired", label: "Stamps required", type: "number" },
    { name: "rewardDescription", label: "Stamp / wheel reward" },
    { name: "qrEnabled", label: "QR enabled", type: "select", options: ["Yes", "No"], table: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "Scheduled", "Paused"], table: true, badge: true },
  ],
};

export function ProgramsPage() {
  return <CrudPage module={module} />;
}
