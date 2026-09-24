/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { GoogleReviewRes } from "@/model/googleReviews";

export class GoogleReviewService extends KriosBaseService<GoogleReviewRes> {
  constructor() {
    super("GoogleReview");
  }
}

export const googleReviewService = new GoogleReviewService();
