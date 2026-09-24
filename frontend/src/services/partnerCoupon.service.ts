/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { PartnerCouponRes } from "@/model/partnerCoupons";

export class PartnerCouponService extends KriosBaseService<PartnerCouponRes> {
  constructor() {
    super("PartnerCoupon");
  }
}

export const partnerCouponService = new PartnerCouponService();
