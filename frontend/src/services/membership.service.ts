/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { MembershipRes } from "@/model/memberships";

export class MembershipService extends KriosBaseService<MembershipRes> {
  constructor() {
    super("Membership");
  }
}

export const membershipService = new MembershipService();
