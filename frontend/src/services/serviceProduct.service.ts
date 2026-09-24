/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { ServiceProductRes } from "@/model/serviceProducts";

export class ServiceProductService extends KriosBaseService<ServiceProductRes> {
  constructor() {
    super("ServiceProduct");
  }
}

export const serviceProductService = new ServiceProductService();
