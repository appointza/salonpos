import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { GrowthTabsLayout } from "@/components/GrowthTabsLayout";
import { guestRewardGames, usePublicBookingSettings } from "@/pages/Book/public-booking-settings";
import { PRIZE_COLOURS, prizeColourName } from "@/pages/PrizeWheel/prize-colours";
import {
  backfillGuestPrizeCatalog,
  deleteGuestPrizeTwin,
  ensureGuestPrizeKey,
  syncGuestPrizeTwin,
  WHEEL_SEGMENTS,
} from "@/pages/PrizeWheel/guest-prize-sync";
import { CUSTOMER_TIERS } from "@/pages/PrizeWheel/reward-distribution";
import { formatPrizeValue, prizeTypeLabel, requirePrizeServiceId } from "@/pages/PrizeWheel/prize-help";
import { PrizeRewardFields } from "@/pages/PrizeWheel/PrizeRewardFields";
import { useData } from "@/store";
import { useTenant } from "@/tenant";

export function PrizeWheelPage() {
  const { orgId } = useTenant();
  const { allRows, create, update, remove } = useData();
  const services = allRows["services"] ?? [];
  const { settings } = usePublicBookingSettings();
  const games = guestRewardGames(settings);
  const guestGame = games.scratch ? "scratch card" : "spin wheel";

  const catalogsReady = "wheelSegments" in allRows && "scratchPrizes" in allRows;

  useEffect(() => {
    if (!catalogsReady) return;
    void backfillGuestPrizeCatalog({ db: allRows, create, update, remove }, orgId);
  }, [orgId, catalogsReady, allRows, create, update, remove]);

  return (
    <GrowthTabsLayout>
      <CrudPage
        module={{
          key: WHEEL_SEGMENTS,
          title: "Guest prizes",
          subtitle:
            `One prize list for the guest game. % off and ₹ off can apply to the whole bill, or to one service you pick. Customers currently play the ${guestGame} (change that in Settings). Saving a prize updates both the wheel and the scratch card.`,
          idPrefix: "WS-",
          fields: [
            { name: "label", label: "Name people see", table: true },
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
              options: ["Percentage discount", "Flat discount", "Free service", "Bonus points", "Partner offer", "No prize"],
              table: true,
            },
            { name: "prizeValue", label: "Offer", type: "number", table: true },
            { name: "serviceId", label: "Service", type: "number", table: true, form: false },
            { name: "colorHex", label: "Colour", type: "select", options: PRIZE_COLOURS.map((c) => c.value), table: true },
            { name: "programId", label: "Program ID", form: false },
            { name: "active", label: "Show in game", type: "select", options: ["Yes", "No"], table: true, badge: true },
          ],
        }}
        extraToolbar={() => (
          <Link to="/settings" className="text-xs text-primary hover:underline">
            Guest game: {guestGame}
          </Link>
        )}
        newButtonLabel="New prize"
        selectOptions={(field) => (field.name === "colorHex" ? [...PRIZE_COLOURS] : undefined)}
        displayValue={(field, row) => {
          if (field.name === "colorHex") return prizeColourName(row["colorHex"]);
          if (field.name === "prizeType") return prizeTypeLabel(String(row["prizeType"] ?? ""));
          if (field.name === "prizeValue") {
            const sid =
              Number(row["serviceId"] ?? 0) ||
              (String(row["prizeType"]) === "Free service" ? Number(row["prizeValue"] ?? 0) : 0);
            const service = services.find((s) => Number(s.id) === sid);
            return formatPrizeValue(String(row["prizeType"] ?? ""), row["prizeValue"], String(service?.["name"] ?? ""));
          }
          if (field.name === "serviceId") {
            const sid =
              Number(row["serviceId"] ?? 0) ||
              (String(row["prizeType"]) === "Free service" ? Number(row["prizeValue"] ?? 0) : 0);
            if (!sid) {
              const kind = String(row["prizeType"] ?? "");
              return kind === "Percentage discount" || kind === "Flat discount" ? "Whole bill" : "—";
            }
            const service = services.find((s) => Number(s.id) === sid);
            return service ? String(service["name"]) : `Service ${sid}`;
          }
          return undefined;
        }}
        renderFormField={(field, editing, setEditing) => {
          if (field.name === "label" || field.name === "prizeValue") return null;
          if (field.name !== "prizeType") return undefined;
          return <PrizeRewardFields editing={editing} setEditing={setEditing} namePlaceholder="10% off the bill" />;
        }}
        prepareNew={(row) => ({
          ...row,
          rewardTier: row["rewardTier"] || "Silver",
          prizeType: row["prizeType"] || "Percentage discount",
          prizeValue: Number(row["prizeValue"] ?? 0) || 10,
          serviceId: Number(row["serviceId"] ?? 0) || 0,
          colorHex: row["colorHex"] || PRIZE_COLOURS[0].value,
          programId: Number(row["programId"] ?? 0) || 0,
          winWeight: Number(row["winWeight"] ?? 1) || 1,
          active: row["active"] || "Yes",
          guestPrizeKey: ensureGuestPrizeKey(row),
        })}
        prepareSave={(row) => {
          const prizeType = String(row["prizeType"] ?? "");
          const serviceId =
            Number(row["serviceId"] ?? 0) || (prizeType === "Free service" ? Number(row["prizeValue"] ?? 0) : 0);
          return {
            ...row,
            programId: Number(row["programId"] ?? 0) || 0,
            prizeValue: prizeType === "Free service" ? serviceId : Number(row["prizeValue"] ?? 0),
            serviceId,
            winWeight: Number(row["winWeight"] ?? 1) || 1,
            guestPrizeKey: ensureGuestPrizeKey(row),
          };
        }}
        validate={(row) => requirePrizeServiceId(row)}
        onSaved={(row) => {
          void syncGuestPrizeTwin({ db: allRows, create, update, remove }, row);
        }}
        onDeleted={(row) => {
          void deleteGuestPrizeTwin({ db: allRows, create, update, remove }, row);
        }}
      />
    </GrowthTabsLayout>
  );
}
