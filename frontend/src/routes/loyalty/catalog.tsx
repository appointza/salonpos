import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { COLLECTIONS } from "@/lib/loyalty/schema";

export const Route = createFileRoute("/loyalty/catalog")({
  component: RewardCatalogPage,
});

function RewardCatalogPage() {
  return (
    <CrudPage
      module={{
        key: COLLECTIONS.rewards,
        title: "Reward catalog",
        subtitle: "Master reward definitions referenced by wheel segments, offers, and stamp programs.",
        idPrefix: "RW-",
        fields: [
          { name: "name", label: "Name", table: true },
          { name: "description", label: "Description", table: true },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: [
              "POINTS",
              "FIXED_DISCOUNT",
              "PERCENT_DISCOUNT",
              "FREE_SERVICE",
              "FREE_ADDON",
              "PARTNER_OFFER",
              "TRY_AGAIN",
            ],
            table: true,
            badge: true,
          },
          { name: "points", label: "Points", type: "number", table: true },
          { name: "discountValue", label: "Discount value", type: "number", table: true },
          { name: "validityDays", label: "Validity (days)", type: "number", table: true },
          { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], table: true, badge: true },
        ],
      }}
    />
  );
}
