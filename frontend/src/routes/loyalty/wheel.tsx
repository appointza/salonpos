import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";

export const Route = createFileRoute("/loyalty/wheel")({
  component: WheelPage,
});

function WheelPage() {
  return (
    <CrudPage
      module={{
        key: "wheelSegments",
        title: "Prize wheel segments",
        subtitle: "Weights are relative. Higher weight wins more often.",
        idPrefix: "WS-",
        fields: [
          { name: "label", label: "Label", table: true },
          {
            name: "prizeType",
            label: "Prize type",
            type: "select",
            options: ["Percentage discount", "Flat discount", "Free service", "Bonus points", "Partner offer", "No prize"],
            table: true,
          },
          { name: "prizeValue", label: "Value", type: "number", table: true },
          { name: "winWeight", label: "Weight", type: "number", table: true },
          { name: "colorHex", label: "Colour", table: true },
          { name: "programId", label: "Program ID" },
          { name: "active", label: "Active", type: "select", options: ["Yes", "No"], table: true, badge: true },
        ],
      }}
    />
  );
}
