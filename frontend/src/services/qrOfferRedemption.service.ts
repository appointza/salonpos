/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { QrOfferRedemptionRes } from "@/model/qrOfferRedemptions";

export class QrOfferRedemptionService extends KriosBaseService<QrOfferRedemptionRes> {
  constructor() {
    super("QrOfferRedemption");
  }
}

export const qrOfferRedemptionService = new QrOfferRedemptionService();
