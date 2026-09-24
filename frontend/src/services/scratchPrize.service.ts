/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { ScratchPrizeRes } from "@/model/scratchPrizes";

export class ScratchPrizeService extends KriosBaseService<ScratchPrizeRes> {
  constructor() {
    super("ScratchPrize");
  }
}

export const scratchPrizeService = new ScratchPrizeService();
