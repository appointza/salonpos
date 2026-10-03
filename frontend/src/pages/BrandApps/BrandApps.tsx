import { CrudPage, type ModuleDef } from "@/components/CrudPage";

const title = "White-Label Apps — Luxe Salon CRM";
const description = "Publish white-label branded apps and websites for each salon outlet.";

const module: ModuleDef = {
  key: "brandApps",
  title: "White-Label Apps",
  subtitle: "Branded app and website publishing per outlet.",
  idPrefix: "BA-",
  fields: [
    { name: "outlet", label: "Outlet", type: "select", options: ["All"], table: true },
    { name: "appName", label: "App name", table: true },
    { name: "primaryColor", label: "Brand colour", table: true },
    { name: "bundleId", label: "Bundle ID", table: true },
    { name: "platform", label: "Platform", type: "select", options: ["iOS + Android", "iOS", "Android"], table: true },
    { name: "version", label: "Version", table: true },
    { name: "website", label: "Website" },
    { name: "status", label: "Status", type: "select", options: ["Draft", "In Review", "Live"], table: true, badge: true },
  ],
};

export function Page() {
  return <CrudPage module={module} />;
}
