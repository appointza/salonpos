/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { MembershipPlanRes } from "@/model/membershipPlans";

export class MembershipPlanService extends KriosBaseService<MembershipPlanRes> {
  constructor() {
    super("MembershipPlan");
  }
}

export const membershipPlanService = new MembershipPlanService();
