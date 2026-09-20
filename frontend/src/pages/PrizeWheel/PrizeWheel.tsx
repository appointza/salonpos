import { CrudPage } from "@/components/CrudPage";
import { CUSTOMER_TIERS } from "@/lib/reward-distribution";
import { REFERENCE_TYPES, useReferenceOptions } from "@/lib/reference-values";

export function PrizeWheelPage() {
  const prizeLabels = useReferenceOptions(REFERENCE_TYPES.PRIZE_LABEL);

  return (
    <CrudPage
      module={{
        key: "wheelSegments",
        title: "Prize wheel",
        subtitle:
          "Set segment labels, prize types and weights. Bronze–Platinum mix is controlled in Settings → Reward tier distribution.",
        idPrefix: "WS-",
        fields: [
          { name: "label", label: "Label", type: "select", table: true },
          {
            name: "rewardTier",
            label: "Reward tier",
            type: "select",
            options: [...CUSTOMER_TIERS],
            table: true,
            badge: true,
          },
          {
            name: "prizeType",
            label: "Prize type",
            type: "select",
            options: ["Percentage discount", "Flat discount", "Free service", "Bonus points", "Partner offer", "No prize"],
            table: true,
          },
          { name: "prizeValue", label: "Value", type: "number", table: true },
          { name: "winWeight", label: "Segment weight", type: "number", table: true },
          { name: "colorHex", label: "Colour", table: true },
          { name: "programId", label: "Program ID" },
          { name: "active", label: "Active", type: "select", options: ["Yes", "No"], table: true, badge: true },
        ],
      }}
      newButtonLabel="New segment"
      selectOptions={(field) => (field.name === "label" ? prizeLabels : undefined)}
      prepareNew={(row) => ({ ...row, rewardTier: row["rewardTier"] || "Silver" })}
    />
  );
}
