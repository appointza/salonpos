import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

const title = "Outlets — Luxe Salon CRM";
const description = "Manage outlets with ownership, GSTIN and royalty terms.";

const today = () => new Date().toISOString().slice(0, 10);

export function Page() {
  return (
    <CrudPage
      module={modules.franchises}
      inlineSaveMode="manual"
      prepareNew={(row) => ({
        ...row,
        type: "Company Owned",
        status: "Active",
        goLive: today(),
      })}
    />
  );
}
