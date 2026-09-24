/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { PartnershipRes } from "@/model/partnerships";

export class PartnershipService extends KriosBaseService<PartnershipRes> {
  constructor() {
    super("Partnership");
  }
}

export const partnershipService = new PartnershipService();
