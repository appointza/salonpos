import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

const title = "Franchises — Luxe Salon CRM";
const description = "Oversee the outlet network with ownership, GSTIN and royalty terms.";

export function Page() {
  return <CrudPage module={modules.franchises} />;
}
