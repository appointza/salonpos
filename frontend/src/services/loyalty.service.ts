/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { LoyaltyRes } from "@/model/loyalty";

export class LoyaltyService extends KriosBaseService<LoyaltyRes> {
  constructor() {
    super("Loyalty");
  }
}

export const loyaltyService = new LoyaltyService();
