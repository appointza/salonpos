/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { VoucherRes } from "@/model/vouchers";

export class VoucherService extends KriosBaseService<VoucherRes> {
  constructor() {
    super("Voucher");
  }
}

export const voucherService = new VoucherService();
