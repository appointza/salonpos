/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { WheelSpinRes } from "@/model/wheelSpins";

export class WheelSpinService extends KriosBaseService<WheelSpinRes> {
  constructor() {
    super("WheelSpin");
  }
}

export const wheelSpinService = new WheelSpinService();
