import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

const title = "White-Label Apps — Luxe Salon CRM";
const description = "Publish white-label branded apps and websites for each salon outlet.";

export const Route = createFileRoute("/brand-apps")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Page,
});

function Page() {
  return <CrudPage module={modules.brandApps} />;
}
