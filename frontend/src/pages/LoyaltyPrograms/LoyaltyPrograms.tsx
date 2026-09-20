import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

export function ProgramsPage() {
  return <CrudPage module={modules.loyalty} />;
}
