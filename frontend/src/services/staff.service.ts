/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { StaffRes } from "@/model/staff";

export class StaffService extends KriosBaseService<StaffRes> {
  constructor() {
    super("Staff");
  }
}

export const staffService = new StaffService();
