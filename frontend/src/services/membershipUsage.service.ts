/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { MembershipUsageRes } from "@/model/membershipUsage";

export class MembershipUsageService extends KriosBaseService<MembershipUsageRes> {
  constructor() {
    super("MembershipUsage");
  }
}

export const membershipUsageService = new MembershipUsageService();
