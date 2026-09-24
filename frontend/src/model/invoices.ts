/** Models for table: invoices (ids are number / BIGINT) */

export class InvoiceRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customer: string = "";
  outlet: string = "";
  date: string = "";
  items: string = "";
  subtotal: number = 0;
  discount: number = 0;
  gstRate: number = 0;
  tax: number = 0;
  total: number = 0;
  payment: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  customerId: number = 0;
  membershipId: number = 0;
}

export class CreateInvoiceReq {
  orgId: number = 0;
  locationId: number = 0;
  customer: string = "";
  outlet: string = "";
  date: string = "";
  items: string = "";
  subtotal: number = 0;
  discount: number = 0;
  gstRate: number = 0;
  tax: number = 0;
  total: number = 0;
  payment: string = "";
  status: string = "";
  customerId: number = 0;
  membershipId: number = 0;
}

export class CreateInvoiceRes extends InvoiceRes {}

export class UpdateInvoiceReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customer: string = "";
  outlet: string = "";
  date: string = "";
  items: string = "";
  subtotal: number = 0;
  discount: number = 0;
  gstRate: number = 0;
  tax: number = 0;
  total: number = 0;
  payment: string = "";
  status: string = "";
  customerId: number = 0;
  membershipId: number = 0;
}

export class UpdateInvoiceRes extends InvoiceRes {}

export class GetInvoiceReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetInvoiceRes extends InvoiceRes {
  errorMessage: string = "";
}

export class ListInvoiceReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListInvoiceRes {
  items: InvoiceRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteInvoiceReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteInvoiceRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}

export class InvoiceBillLine {
  id: number = 0;
  kind: string = "";
  name: string = "";
  price: number = 0;
  gstRate: number = 0;
  qty: number = 0;
  commission: number = 0;
  staff: string = "";
  staffId: number = 0;
}

export class InvoiceRewardRefs {
  wheelSpinId: number = 0;
  offerRedemptionId: number = 0;
  partnerCouponId: number = 0;
}

export class InvoiceDiscountLine {
  label: string = "";
  amount: number = 0;
}

export class InvoiceQuoteReq {
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  lines: InvoiceBillLine[] = [];
  discount: number = 0;
  pointsRedeemed: number = 0;
  payment: string = "";
  rewards: InvoiceRewardRefs = new InvoiceRewardRefs();
  couponCodes: string[] = [];
  outletName: string = "";
}

export class InvoiceQuoteRes {
  subtotal: number = 0;
  membershipDiscount: number = 0;
  rewardDiscount: number = 0;
  rewardLines: InvoiceDiscountLine[] = [];
  couponDiscount: number = 0;
  otherDiscount: number = 0;
  loyaltyValue: number = 0;
  taxable: number = 0;
  tax: number = 0;
  total: number = 0;
  pointsToEarn: number = 0;
  pointsRedeemApplied: number = 0;
  customerPoints: number = 0;
  rupeesPerPoint: number = 1;
  programId: number = 0;
  expiryMonths: number = 0;
  errorMessage: string = "";
}

export class InvoiceCompleteSaleReq extends InvoiceQuoteReq {
  appointmentId: number = 0;
}

export class InvoiceCompleteSaleRes {
  invoice: InvoiceRes = new InvoiceRes();
  quote: InvoiceQuoteRes = new InvoiceQuoteRes();
  pointsEarned: number = 0;
  pointsAfter: number = 0;
  errorMessage: string = "";
}

export class InvoiceRefundReq {
  id: number = 0;
  orgId: number = 0;
  reason: string = "";
}

export class InvoiceRefundRes {
  success: boolean = false;
  errorMessage: string = "";
}
