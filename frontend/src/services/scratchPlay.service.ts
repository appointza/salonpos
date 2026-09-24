/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { ScratchPlayRes } from "@/model/scratchPlays";

export class ScratchPlayService extends KriosBaseService<ScratchPlayRes> {
  constructor() {
    super("ScratchPlay");
  }
}

export const scratchPlayService = new ScratchPlayService();
