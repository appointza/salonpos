import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

const title = "White-Label Apps — Luxe Salon CRM";
const description = "Publish white-label branded apps and websites for each salon outlet.";

export function Page() {
  return <CrudPage module={modules.brandApps} />;
}
