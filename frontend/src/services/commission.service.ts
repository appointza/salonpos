/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { CommissionRes } from "@/model/commissions";

export class CommissionService extends KriosBaseService<CommissionRes> {
  constructor() {
    super("Commission");
  }
}

export const commissionService = new CommissionService();
