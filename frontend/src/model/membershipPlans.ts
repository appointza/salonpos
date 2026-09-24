/** Models for table: membershipPlans (ids are number / BIGINT) */

export class MembershipPlanRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  price: number = 0;
  validityMonths: number = 0;
  benefits: string = "";
  includedMatch: string = "";
  includedLimit: number = 0;
  extraDiscountMatch: string = "";
  extraDiscountPct: number = 0;
  retailDiscountPct: number = 0;
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateMembershipPlanReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  price: number = 0;
  validityMonths: number = 0;
  benefits: string = "";
  includedMatch: string = "";
  includedLimit: number = 0;
  extraDiscountMatch: string = "";
  extraDiscountPct: number = 0;
  retailDiscountPct: number = 0;
  status: string = "";
}

export class CreateMembershipPlanRes extends MembershipPlanRes {}

export class UpdateMembershipPlanReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  price: number = 0;
  validityMonths: number = 0;
  benefits: string = "";
  includedMatch: string = "";
  includedLimit: number = 0;
  extraDiscountMatch: string = "";
  extraDiscountPct: number = 0;
  retailDiscountPct: number = 0;
  status: string = "";
}

export class UpdateMembershipPlanRes extends MembershipPlanRes {}

export class GetMembershipPlanReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetMembershipPlanRes extends MembershipPlanRes {
  errorMessage: string = "";
}

export class ListMembershipPlanReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListMembershipPlanRes {
  items: MembershipPlanRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteMembershipPlanReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteMembershipPlanRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
