import { CrudPage } from "@/components/CrudPage";

export function PartnersPage() {
  return (
    <CrudPage
      module={{
        key: "partnerships",
        title: "Cross-business partners",
        subtitle: "Each side absorbs its own discount. No settlement through the platform.",
        idPrefix: "PT-",
        fields: [
          { name: "partnerName", label: "Partner", table: true },
          { name: "outboundOffer", label: "We give them", table: true },
          { name: "inboundOffer", label: "They give us", table: true },
          { name: "issued", label: "Coupons issued", type: "number", table: true },
          { name: "redeemed", label: "Redeemed", type: "number", table: true },
          { name: "status", label: "Status", type: "select", options: ["Invited", "Active", "Paused", "Ended"], table: true, badge: true },
        ],
      }}
    />
  );
}
