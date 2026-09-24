/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { QrOfferRes } from "@/model/qrOffers";

export class QrOfferService extends KriosBaseService<QrOfferRes> {
  constructor() {
    super("QrOffer");
  }
}

export const qrOfferService = new QrOfferService();
