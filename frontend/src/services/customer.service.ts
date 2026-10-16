import { toRow } from "@/entity-row";
import type { Db, Row } from "@/store";
import { KriosBaseService } from "@/services/krios-base.service";
import type {
  CustomerLoyaltySummaryReq,
  CustomerLoyaltySummaryRes,
  CustomerPosLookupReq,
  CustomerPosLookupRes,
  CustomerRes,
  CustomerValidateWalkInCodeReq,
  CustomerValidateWalkInCodeRes,
} from "@/model/customers";

export class CustomerService extends KriosBaseService<CustomerRes> {
  constructor() {
    super("Customer");
  }

  async loyaltySummary(req: CustomerLoyaltySummaryReq): Promise<CustomerLoyaltySummaryRes> {
    return this.postAction<CustomerLoyaltySummaryReq, CustomerLoyaltySummaryRes>("LoyaltySummary", req);
  }

  async lookupAtPos(req: CustomerPosLookupReq, publicGuest = false): Promise<CustomerPosLookupRes> {
    return this.postAction<CustomerPosLookupReq, CustomerPosLookupRes>("LookupAtPos", req, publicGuest);
  }

  async validateWalkInCode(req: CustomerValidateWalkInCodeReq, publicGuest = false): Promise<CustomerValidateWalkInCodeRes> {
    return this.postAction<CustomerValidateWalkInCodeReq, CustomerValidateWalkInCodeRes>(
      "ValidateWalkInCode",
      req,
      publicGuest,
    );
  }
}

export const customerService = new CustomerService();

function rowsOf(items: Record<string, unknown>[] | undefined): Row[] {
  return (items ?? []).map((item) => toRow(item));
}

function upsertRows(prev: Row[] | undefined, incoming: Row[]) {
  const ids = new Set(incoming.map((r) => String(r.id)));
  return [...incoming, ...(prev ?? []).filter((r) => !ids.has(String(r.id)))];
}

export function mergePosLookup(prev: Db, res: CustomerPosLookupRes): Db {
  const customer = res.customer ? toRow(res.customer as unknown as Record<string, unknown>) : null;
  return {
    ...prev,
    customers: customer
      ? [customer, ...(prev["customers"] ?? []).filter((c) => String(c.id) !== String(customer.id))]
      : prev["customers"] ?? [],
    memberships: rowsOf(res.memberships),
    membershipPlans: rowsOf(res.membershipPlans),
    membershipUsage: rowsOf(res.membershipUsage),
    vouchers: rowsOf(res.vouchers),
    scratchPlays: rowsOf(res.scratchPlays),
    wheelSpins: rowsOf(res.wheelSpins),
    qrOfferRedemptions: rowsOf(res.qrOfferRedemptions),
    qrOffers: rowsOf(res.qrOffers),
    partnerCoupons: rowsOf(res.partnerCoupons),
    loyalty: rowsOf(res.loyalty),
  };
}

/** Keep existing prize rows so org-wide lookups can stack every outlet profile. */
export function mergePosLookupKeep(prev: Db, res: CustomerPosLookupRes): Db {
  const next = mergePosLookup(prev, res);
  return {
    ...next,
    memberships: upsertRows(prev["memberships"], next["memberships"] ?? []),
    membershipUsage: upsertRows(prev["membershipUsage"], next["membershipUsage"] ?? []),
    vouchers: upsertRows(prev["vouchers"], next["vouchers"] ?? []),
    scratchPlays: upsertRows(prev["scratchPlays"], next["scratchPlays"] ?? []),
    wheelSpins: upsertRows(prev["wheelSpins"], next["wheelSpins"] ?? []),
    qrOfferRedemptions: upsertRows(prev["qrOfferRedemptions"], next["qrOfferRedemptions"] ?? []),
    qrOffers: upsertRows(prev["qrOffers"], next["qrOffers"] ?? []),
    partnerCoupons: upsertRows(prev["partnerCoupons"], next["partnerCoupons"] ?? []),
    loyalty: upsertRows(prev["loyalty"], next["loyalty"] ?? []),
  };
}
