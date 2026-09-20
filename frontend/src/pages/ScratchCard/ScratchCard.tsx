import { CrudPage } from "@/components/CrudPage";
import { CUSTOMER_TIERS } from "@/lib/reward-distribution";
import { REFERENCE_TYPES, useReferenceOptions } from "@/lib/reference-values";

export function ScratchCardPage() {
  const prizeLabels = useReferenceOptions(REFERENCE_TYPES.PRIZE_LABEL);

  return (
    <CrudPage
      module={{
        key: "scratchPrizes",
        title: "Scratch card",
        subtitle:
          "Weighted prizes revealed when guests scratch the foil. Tier mix is controlled in Settings → Reward tier distribution.",
        idPrefix: "SP-",
        fields: [
          { name: "label", label: "Prize label", type: "select", table: true },
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
            options: [
              "Percentage discount",
              "Flat discount",
              "Free service",
              "Bonus points",
              "Partner offer",
              "No prize",
            ],
            table: true,
          },
          { name: "prizeValue", label: "Value", type: "number", table: true },
          { name: "winWeight", label: "Prize weight", type: "number", table: true },
          { name: "colorHex", label: "Card colour", table: true },
          { name: "programId", label: "Program ID" },
          { name: "active", label: "Active", type: "select", options: ["Yes", "No"], table: true, badge: true },
        ],
      }}
      newButtonLabel="New prize"
      selectOptions={(field) => (field.name === "label" ? prizeLabels : undefined)}
      prepareNew={(row) => ({ ...row, rewardTier: row["rewardTier"] || "Silver" })}
    />
  );
}
