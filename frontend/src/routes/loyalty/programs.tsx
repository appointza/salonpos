import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";

export const Route = createFileRoute("/loyalty/programs")({
  component: ProgramsPage,
});

function ProgramsPage() {
  return <CrudPage module={modules.loyalty} />;
}
