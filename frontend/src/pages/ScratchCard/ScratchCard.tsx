import { CrudPage } from "@/components/CrudPage";
import { PRIZE_COLOURS, prizeColourName } from "@/pages/PrizeWheel/prize-colours";
import { CUSTOMER_TIERS } from "@/pages/PrizeWheel/reward-distribution";
import { formatPrizeValue, prizeTypeLabel, requirePrizeServiceId } from "@/pages/PrizeWheel/prize-help";
import { PrizeRewardFields } from "@/pages/PrizeWheel/PrizeRewardFields";

export function ScratchCardPage() {
  return (
    <CrudPage
      module={{
        key: "scratchPrizes",
        title: "Scratch card",
        subtitle:
          "Each card prize is one gift. Pick what the gift is, then follow the box. Free treatment does not need a number — pick the service instead.",
        idPrefix: "SP-",
        fields: [
          { name: "label", label: "Name on the card", table: true },
          {
            name: "rewardTier",
            label: "Who can win this",
            type: "select",
            options: [...CUSTOMER_TIERS],
            table: true,
            badge: true,
          },
          {
            name: "prizeType",
            label: "What gift is this?",
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
          { name: "prizeValue", label: "Gift amount", type: "number", table: true },
          { name: "colorHex", label: "Card colour", type: "select", options: PRIZE_COLOURS.map((c) => c.value), table: true },
          { name: "programId", label: "Program ID", form: false },
          { name: "active", label: "Show on card", type: "select", options: ["Yes", "No"], table: true, badge: true },
        ],
      }}
      newButtonLabel="New prize"
      selectOptions={(field) => (field.name === "colorHex" ? [...PRIZE_COLOURS] : undefined)}
      displayValue={(field, row) => {
        if (field.name === "colorHex") return prizeColourName(row["colorHex"]);
        if (field.name === "prizeType") return prizeTypeLabel(String(row["prizeType"] ?? ""));
        if (field.name === "prizeValue") return formatPrizeValue(String(row["prizeType"] ?? ""), row["prizeValue"]);
        return undefined;
      }}
      renderFormField={(field, editing, setEditing) => {
        if (field.name === "label" || field.name === "prizeValue") return null;
        if (field.name !== "prizeType") return undefined;
        return (
          <PrizeRewardFields
            editing={editing}
            setEditing={setEditing}
            namePlaceholder="Free hair spa"
          />
        );
      }}
      prepareNew={(row) => ({
        ...row,
        rewardTier: row["rewardTier"] || "Silver",
        prizeType: row["prizeType"] || "Free service",
        prizeValue: Number(row["prizeValue"] ?? 0),
        colorHex: row["colorHex"] || PRIZE_COLOURS[0].value,
        programId: Number(row["programId"] ?? 0) || 0,
        winWeight: Number(row["winWeight"] ?? 1) || 1,
        active: row["active"] || "Yes",
      })}
      prepareSave={(row) => ({
        ...row,
        programId: Number(row["programId"] ?? 0) || 0,
        prizeValue: Number(row["prizeValue"] ?? 0),
        winWeight: Number(row["winWeight"] ?? 1) || 1,
      })}
      validate={(row) => requirePrizeServiceId(row)}
    />
  );
}
