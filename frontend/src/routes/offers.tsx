import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";

const title = "QR Offers — Luxe Salon CRM";
const description = "Birthday, welcome and tier offers shown after customer check-in.";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  return (
    <CrudPage
      module={{
        key: "qrOffers",
        title: "QR offers",
        subtitle: "Birthday, welcome and tier offers shown after check-in.",
        idPrefix: "QO-",
        fields: [
          { name: "title", label: "Title", table: true },
          { name: "description", label: "Description", table: true },
          {
            name: "offerType",
            label: "Type",
            type: "select",
            options: ["% off", "Flat off", "Free item", "Free service"],
            table: true,
          },
          {
            name: "eligibleSegment",
            label: "Segment",
            type: "select",
            options: ["All", "Birthday", "New customer", "Gold", "Platinum"],
            table: true,
          },
          { name: "validityStart", label: "Starts", type: "date", table: true },
          { name: "validityEnd", label: "Ends", type: "date", table: true },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: ["Draft", "Active", "Paused", "Expired"],
            table: true,
            badge: true,
          },
        ],
      }}
    />
  );
}
