/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { AppointmentRes } from "@/model/appointments";

export class AppointmentService extends KriosBaseService<AppointmentRes> {
  constructor() {
    super("Appointment");
  }
}

export const appointmentService = new AppointmentService();
