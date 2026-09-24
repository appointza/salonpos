/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { WheelSegmentRes } from "@/model/wheelSegments";

export class WheelSegmentService extends KriosBaseService<WheelSegmentRes> {
  constructor() {
    super("WheelSegment");
  }
}

export const wheelSegmentService = new WheelSegmentService();
