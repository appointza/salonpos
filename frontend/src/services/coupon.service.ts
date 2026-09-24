/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { CouponClaimAtPosReq, CouponClaimAtPosRes, CouponRes, CouponValidateAtPosReq, CouponValidateAtPosRes } from "@/model/coupons";

export class CouponService extends KriosBaseService<CouponRes> {
  constructor() {
    super("Coupon");
  }

  async validateAtPos(req: CouponValidateAtPosReq): Promise<CouponValidateAtPosRes> {
    return this.postAction<CouponValidateAtPosReq, CouponValidateAtPosRes>("ValidateAtPos", req);
  }

  async claimAtPos(req: CouponClaimAtPosReq): Promise<CouponClaimAtPosRes> {
    return this.postAction<CouponClaimAtPosReq, CouponClaimAtPosRes>("ClaimAtPos", req);
  }
}

export const couponService = new CouponService();
