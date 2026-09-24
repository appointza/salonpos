/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { ServiceRes } from "@/model/services";

export class ServiceService extends KriosBaseService<ServiceRes> {
  constructor() {
    super("Service");
  }
}

export const serviceService = new ServiceService();
