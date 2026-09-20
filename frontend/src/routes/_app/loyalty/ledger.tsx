import { createFileRoute } from "@tanstack/react-router";
import { LedgerPage } from "@/pages/LoyaltyLedger/LoyaltyLedger";


export const Route = createFileRoute("/_app/loyalty/ledger")({
  component: LedgerPage,
});
