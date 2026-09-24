import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

export function Page() {
  return <CrudPage module={modules.vendors} />;
}
