/** Models for table: vouchers (ids are number / BIGINT) */

export class VoucherRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  couponId: number = 0;
  code: string = "";
  voucherType: string = "";
  amount: number = 0;
  issueTo: string = "";
  customerId: number = 0;
  billId: number = 0;
  invoiceId: number = 0;
  status: string = "";
  unlimited: string = "";
  issuedAt: string = "";
  redeemedAt: string = "";
  schemeCode: string = "";
  schemeTitle: string = "";
  poolIndex: number = 0;
  poolGenerated: string = "";
  discountAmount: number = 0;
  redeemedLocationId: number = 0;
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateVoucherReq {
  orgId: number = 0;
  locationId: number = 0;
  couponId: number = 0;
  code: string = "";
  voucherType: string = "";
  amount: number = 0;
  issueTo: string = "";
  customerId: number = 0;
  billId: number = 0;
  invoiceId: number = 0;
  status: string = "";
  unlimited: string = "";
  issuedAt: string = "";
  redeemedAt: string = "";
  schemeCode: string = "";
  schemeTitle: string = "";
  poolIndex: number = 0;
  poolGenerated: string = "";
  discountAmount: number = 0;
  redeemedLocationId: number = 0;
}

export class CreateVoucherRes extends VoucherRes {}

export class UpdateVoucherReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  couponId: number = 0;
  code: string = "";
  voucherType: string = "";
  amount: number = 0;
  issueTo: string = "";
  customerId: number = 0;
  billId: number = 0;
  invoiceId: number = 0;
  status: string = "";
  unlimited: string = "";
  issuedAt: string = "";
  redeemedAt: string = "";
  schemeCode: string = "";
  schemeTitle: string = "";
  poolIndex: number = 0;
  poolGenerated: string = "";
  discountAmount: number = 0;
  redeemedLocationId: number = 0;
}

export class UpdateVoucherRes extends VoucherRes {}

export class GetVoucherReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetVoucherRes extends VoucherRes {
  errorMessage: string = "";
}

export class ListVoucherReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListVoucherRes {
  items: VoucherRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteVoucherReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteVoucherRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
