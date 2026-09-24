/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { QrCheckinRes } from "@/model/qrCheckins";

export class QrCheckinService extends KriosBaseService<QrCheckinRes> {
  constructor() {
    super("QrCheckin");
  }
}

export const qrCheckinService = new QrCheckinService();
