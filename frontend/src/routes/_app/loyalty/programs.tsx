import { createFileRoute } from "@tanstack/react-router";
import { ProgramsPage } from "@/pages/LoyaltyPrograms/LoyaltyPrograms";


export const Route = createFileRoute("/_app/loyalty/programs")({
  component: ProgramsPage,
});
