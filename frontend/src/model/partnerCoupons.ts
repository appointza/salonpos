/** Models for table: partnerCoupons (ids are number / BIGINT) */

export class PartnerCouponRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  partnerId: number = 0;
  customerId: number = 0;
  direction: string = "";
  offer: string = "";
  couponCode: string = "";
  status: string = "";
  issuedAt: string = "";
  redeemedAt: string = "";
  invoiceId: number = 0;
}

export class CreatePartnerCouponReq {
  orgId: number = 0;
  locationId: number = 0;
  partnerId: number = 0;
  customerId: number = 0;
  direction: string = "";
  offer: string = "";
  couponCode: string = "";
  status: string = "";
  issuedAt: string = "";
  redeemedAt: string = "";
  invoiceId: number = 0;
}

export class CreatePartnerCouponRes extends PartnerCouponRes {}

export class UpdatePartnerCouponReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  partnerId: number = 0;
  customerId: number = 0;
  direction: string = "";
  offer: string = "";
  couponCode: string = "";
  status: string = "";
  issuedAt: string = "";
  redeemedAt: string = "";
  invoiceId: number = 0;
}

export class UpdatePartnerCouponRes extends PartnerCouponRes {}

export class GetPartnerCouponReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetPartnerCouponRes extends PartnerCouponRes {
  errorMessage: string = "";
}

export class ListPartnerCouponReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListPartnerCouponRes {
  items: PartnerCouponRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeletePartnerCouponReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeletePartnerCouponRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
