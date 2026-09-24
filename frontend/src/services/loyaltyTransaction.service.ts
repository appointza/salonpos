/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { LoyaltyTransactionRes } from "@/model/loyaltyTransactions";

export class LoyaltyTransactionService extends KriosBaseService<LoyaltyTransactionRes> {
  constructor() {
    super("LoyaltyTransaction");
  }
}

export const loyaltyTransactionService = new LoyaltyTransactionService();
