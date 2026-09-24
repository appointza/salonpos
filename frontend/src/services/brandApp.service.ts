/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { BrandAppRes } from "@/model/brandApps";

export class BrandAppService extends KriosBaseService<BrandAppRes> {
  constructor() {
    super("BrandApp");
  }
}

export const brandAppService = new BrandAppService();
