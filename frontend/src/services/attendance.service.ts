/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { AttendanceRes } from "@/model/attendance";

export class AttendanceService extends KriosBaseService<AttendanceRes> {
  constructor() {
    super("Attendance");
  }
}

export const attendanceService = new AttendanceService();
