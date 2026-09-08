import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";

export const Route = createFileRoute("/loyalty/rewards")({
  component: RewardsPage,
});

function RewardsPage() {
  return (
    <CrudPage
      module={{
        key: "customerRewards",
        title: "Customer rewards",
        subtitle: "Stamp completions and other issued rewards awaiting POS redemption.",
        idPrefix: "CR-",
        fields: [
          { name: "customerId", label: "Customer ID", table: true },
          { name: "title", label: "Title", table: true },
          { name: "description", label: "Description", table: true },
          {
            name: "sourceType",
            label: "Source",
            type: "select",
            options: ["stamp", "wheel", "offer", "referral", "campaign"],
            table: true,
          },
          {
            name: "rewardType",
            label: "Type",
            type: "select",
            options: ["Free service", "Free item", "Flat discount", "Percentage discount"],
            table: true,
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: ["Available", "Redeemed", "Expired", "Cancelled"],
            table: true,
            badge: true,
          },
          { name: "issuedAt", label: "Issued", type: "date", table: true },
          { name: "expiresAt", label: "Expires", type: "date", table: true },
          { name: "invoiceId", label: "Invoice", table: true },
        ],
      }}
    />
  );
}
