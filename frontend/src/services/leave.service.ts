/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { LeaveRes } from "@/model/leaves";

export class LeaveService extends KriosBaseService<LeaveRes> {
  constructor() {
    super("Leave");
  }
}

export const leaveService = new LeaveService();
