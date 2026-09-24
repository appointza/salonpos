/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { ShiftRes } from "@/model/shifts";

export class ShiftService extends KriosBaseService<ShiftRes> {
  constructor() {
    super("Shift");
  }
}

export const shiftService = new ShiftService();
