import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

export const Route = createFileRoute("/_app/vendors")({
  head: () => ({
    meta: [{ title: "Vendors — Krios" }, { name: "description", content: "Manage product and service vendors." }],
  }),
  component: () => <CrudPage module={modules.vendors} />,
});
