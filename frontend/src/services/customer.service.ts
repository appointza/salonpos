import { toRow } from "@/entity-row";
import type { Db, Row } from "@/store";
import { KriosBaseService } from "@/services/krios-base.service";
import type {
  CustomerLoyaltySummaryReq,
  CustomerLoyaltySummaryRes,
  CustomerPosLookupReq,
  CustomerPosLookupRes,
  CustomerRes,
} from "@/model/customers";

export class CustomerService extends KriosBaseService<CustomerRes> {
  constructor() {
    super("Customer");
  }

  async loyaltySummary(req: CustomerLoyaltySummaryReq): Promise<CustomerLoyaltySummaryRes> {
    return this.postAction<CustomerLoyaltySummaryReq, CustomerLoyaltySummaryRes>("LoyaltySummary", req);
  }

  async lookupAtPos(req: CustomerPosLookupReq): Promise<CustomerPosLookupRes> {
    return this.postAction<CustomerPosLookupReq, CustomerPosLookupRes>("LookupAtPos", req);
  }
}

export const customerService = new CustomerService();

export function mergePosLookup(prev: Db, res: CustomerPosLookupRes): Db {
  const rows = (items: Record<string, unknown>[] | undefined): Row[] =>
    (items ?? []).map((item) => toRow(item));
  const customer = res.customer ? toRow(res.customer as unknown as Record<string, unknown>) : null;
  return {
    ...prev,
    customers: customer
      ? [customer, ...(prev["customers"] ?? []).filter((c) => String(c.id) !== String(customer.id))]
      : prev["customers"] ?? [],
    memberships: rows(res.memberships),
    membershipPlans: rows(res.membershipPlans),
    membershipUsage: rows(res.membershipUsage),
    vouchers: rows(res.vouchers),
    scratchPlays: rows(res.scratchPlays),
    wheelSpins: rows(res.wheelSpins),
    qrOfferRedemptions: rows(res.qrOfferRedemptions),
    qrOffers: rows(res.qrOffers),
    partnerCoupons: rows(res.partnerCoupons),
    loyalty: rows(res.loyalty),
  };
}
