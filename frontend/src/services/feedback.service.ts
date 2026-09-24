/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { FeedbackRes } from "@/model/feedback";

export class FeedbackService extends KriosBaseService<FeedbackRes> {
  constructor() {
    super("Feedback");
  }
}

export const feedbackService = new FeedbackService();
