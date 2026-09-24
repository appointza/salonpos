/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { VendorRes } from "@/model/vendors";

export class VendorService extends KriosBaseService<VendorRes> {
  constructor() {
    super("Vendor");
  }
}

export const vendorService = new VendorService();
