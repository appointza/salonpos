import { useEffect } from "react";
import { CrudPage, type ModuleDef } from "@/components/CrudPage";
import { useCollection } from "@/store";
import { useTenant } from "@/tenant";

const title = "Outlets — Luxe Salon CRM";
const description = "Manage outlets with address, ownership, GSTIN and royalty terms.";

const today = () => new Date().toISOString().slice(0, 10);

const module: ModuleDef = {
  key: "franchises",
  title: "Outlets",
  subtitle: "Outlet network, street address, ownership, GSTIN and royalty terms.",
  idPrefix: "FR-",
  fields: [
    { name: "name", label: "Outlet name", table: true },
    { name: "type", label: "Type", type: "select", options: ["Company Owned", "Licensed outlet"], table: true, badge: true },
    { name: "address", label: "Address", type: "textarea", table: true },
    { name: "city", label: "City", table: true },
    { name: "owner", label: "Owner / manager", table: true },
    { name: "phone", label: "Phone" },
    { name: "gstin", label: "GSTIN", table: true },
    { name: "royalty", label: "Royalty %", type: "number", table: true },
    { name: "goLive", label: "Go-live date", type: "date", table: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "Onboarding", "Suspended"], table: true, badge: true },
  ],
};

export function Page() {
  const { reloadTenants } = useTenant();
  const { rows } = useCollection("franchises", { refetchOnMount: true });

  useEffect(() => {
    void reloadTenants();
  }, [rows.length, reloadTenants]);

  return (
    <CrudPage
      module={module}
      inlineSaveMode="manual"
      prepareNew={(row) => ({
        ...row,
        locationId: 0,
        type: "Company Owned",
        status: "Active",
        goLive: today(),
      })}
      onSaved={() => {
        void reloadTenants();
      }}
    />
  );
}
