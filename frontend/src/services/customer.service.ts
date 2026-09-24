/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { CustomerLoyaltySummaryReq, CustomerLoyaltySummaryRes, CustomerRes } from "@/model/customers";

export class CustomerService extends KriosBaseService<CustomerRes> {
  constructor() {
    super("Customer");
  }

  async loyaltySummary(req: CustomerLoyaltySummaryReq): Promise<CustomerLoyaltySummaryRes> {
    return this.postAction<CustomerLoyaltySummaryReq, CustomerLoyaltySummaryRes>("LoyaltySummary", req);
  }
}

export const customerService = new CustomerService();
