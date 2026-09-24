/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { PayrollRes } from "@/model/payroll";

export class PayrollService extends KriosBaseService<PayrollRes> {
  constructor() {
    super("Payroll");
  }
}

export const payrollService = new PayrollService();
