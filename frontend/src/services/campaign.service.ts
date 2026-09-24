/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { CampaignRes } from "@/model/campaigns";

export class CampaignService extends KriosBaseService<CampaignRes> {
  constructor() {
    super("Campaign");
  }
}

export const campaignService = new CampaignService();
