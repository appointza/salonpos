import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

const title = "Staff — Luxe Salon CRM";
const description = "Maintain staff records with salary, commission rates and monthly targets.";

export function Page() {
  return <CrudPage module={modules.staff} />;
}
