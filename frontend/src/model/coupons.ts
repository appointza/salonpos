/** Models for table: coupons (ids are number / BIGINT) */

export class CouponRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  code: string = "";
  codePrefix: string = "";
  codeSuffix: string = "";
  codeStartNumber: number = 0;
  codeLength: number = 0;
  couponQuantity: number = 0;
  autoGenerateCodes: string = "";
  eligibleLocationIds: string = "";
  allowWithOtherDiscounts: string = "";
  allowWithLoyalty: string = "";
  title: string = "";
  description: string = "";
  discountType: string = "";
  discountValue: number = 0;
  maxDiscount: number = 0;
  flatPrice: number = 0;
  buyQty: number = 0;
  freeQty: number = 0;
  freeItemName: string = "";
  appliesTo: string = "";
  targetIds: string = "";
  targetNames: string = "";
  minBillAmount: number = 0;
  minQuantity: number = 0;
  minBookingValue: number = 0;
  customerSegment: string = "";
  targetCustomerId: number = 0;
  discountSlabs: string = "";
  inactiveDays: number = 0;
  staffId: number = 0;
  paymentMethod: string = "";
  firstAppointmentOnly: string = "";
  advanceBookingDays: number = 0;
  validityStart: string = "";
  validityEnd: string = "";
  validDays: string = "";
  validTimeStart: string = "";
  validTimeEnd: string = "";
  flashEndsAt: string = "";
  usageLimitMode: string = "";
  totalUsageLimit: number = 0;
  perCustomerLimit: number = 0;
  usageCount: number = 0;
  status: string = "";
  campaignTag: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateCouponReq {
  orgId: number = 0;
  locationId: number = 0;
  code: string = "";
  codePrefix: string = "";
  codeSuffix: string = "";
  codeStartNumber: number = 0;
  codeLength: number = 0;
  couponQuantity: number = 0;
  autoGenerateCodes: string = "";
  eligibleLocationIds: string = "";
  allowWithOtherDiscounts: string = "";
  allowWithLoyalty: string = "";
  title: string = "";
  description: string = "";
  discountType: string = "";
  discountValue: number = 0;
  maxDiscount: number = 0;
  flatPrice: number = 0;
  buyQty: number = 0;
  freeQty: number = 0;
  freeItemName: string = "";
  appliesTo: string = "";
  targetIds: string = "";
  targetNames: string = "";
  minBillAmount: number = 0;
  minQuantity: number = 0;
  minBookingValue: number = 0;
  customerSegment: string = "";
  targetCustomerId: number = 0;
  discountSlabs: string = "";
  inactiveDays: number = 0;
  staffId: number = 0;
  paymentMethod: string = "";
  firstAppointmentOnly: string = "";
  advanceBookingDays: number = 0;
  validityStart: string = "";
  validityEnd: string = "";
  validDays: string = "";
  validTimeStart: string = "";
  validTimeEnd: string = "";
  flashEndsAt: string = "";
  usageLimitMode: string = "";
  totalUsageLimit: number = 0;
  perCustomerLimit: number = 0;
  usageCount: number = 0;
  status: string = "";
  campaignTag: string = "";
}

export class CreateCouponRes extends CouponRes {}

export class UpdateCouponReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  code: string = "";
  codePrefix: string = "";
  codeSuffix: string = "";
  codeStartNumber: number = 0;
  codeLength: number = 0;
  couponQuantity: number = 0;
  autoGenerateCodes: string = "";
  eligibleLocationIds: string = "";
  allowWithOtherDiscounts: string = "";
  allowWithLoyalty: string = "";
  title: string = "";
  description: string = "";
  discountType: string = "";
  discountValue: number = 0;
  maxDiscount: number = 0;
  flatPrice: number = 0;
  buyQty: number = 0;
  freeQty: number = 0;
  freeItemName: string = "";
  appliesTo: string = "";
  targetIds: string = "";
  targetNames: string = "";
  minBillAmount: number = 0;
  minQuantity: number = 0;
  minBookingValue: number = 0;
  customerSegment: string = "";
  targetCustomerId: number = 0;
  discountSlabs: string = "";
  inactiveDays: number = 0;
  staffId: number = 0;
  paymentMethod: string = "";
  firstAppointmentOnly: string = "";
  advanceBookingDays: number = 0;
  validityStart: string = "";
  validityEnd: string = "";
  validDays: string = "";
  validTimeStart: string = "";
  validTimeEnd: string = "";
  flashEndsAt: string = "";
  usageLimitMode: string = "";
  totalUsageLimit: number = 0;
  perCustomerLimit: number = 0;
  usageCount: number = 0;
  status: string = "";
  campaignTag: string = "";
}

export class UpdateCouponRes extends CouponRes {}

export class GetCouponReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetCouponRes extends CouponRes {
  errorMessage: string = "";
}

export class ListCouponReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListCouponRes {
  items: CouponRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteCouponReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteCouponRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}

export class CouponCartLine {
  id: number = 0;
  kind: string = "";
  category: string = "";
  name: string = "";
  price: number = 0;
  qty: number = 0;
}

export class CouponValidateAtPosReq {
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  code: string = "";
  lines: CouponCartLine[] = [];
  paymentMethod: string = "";
  alreadyAppliedCouponIds: number[] = [];
}

export class CouponValidateAtPosRes {
  ok: boolean = false;
  reason: string = "";
  couponId: number = 0;
  code: string = "";
  title: string = "";
  amount: number = 0;
  eligibleSubtotal: number = 0;
}

export class CouponClaimAtPosReq {
  orgId: number = 0;
  couponId: number = 0;
  customerId: number = 0;
  invoiceId: number = 0;
  discountAmount: number = 0;
}

export class CouponClaimAtPosRes {
  success: boolean = false;
  errorMessage: string = "";
}
