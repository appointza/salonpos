/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { ReferenceValueRes } from "@/model/referenceValues";

export class ReferenceValueService extends KriosBaseService<ReferenceValueRes> {
  constructor() {
    super("ReferenceValue");
  }
}

export const referenceValueService = new ReferenceValueService();
