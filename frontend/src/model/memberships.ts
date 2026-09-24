/** Models for table: memberships (ids are number / BIGINT) */

export class MembershipRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  plan: string = "";
  startDate: string = "";
  endDate: string = "";
  used: number = 0;
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  planId: number = 0;
  customerId: number = 0;
}

export class CreateMembershipReq {
  orgId: number = 0;
  locationId: number = 0;
  plan: string = "";
  startDate: string = "";
  endDate: string = "";
  used: number = 0;
  status: string = "";
  planId: number = 0;
  customerId: number = 0;
}

export class CreateMembershipRes extends MembershipRes {}

export class UpdateMembershipReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  plan: string = "";
  startDate: string = "";
  endDate: string = "";
  used: number = 0;
  status: string = "";
  planId: number = 0;
  customerId: number = 0;
}

export class UpdateMembershipRes extends MembershipRes {}

export class GetMembershipReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetMembershipRes extends MembershipRes {
  errorMessage: string = "";
}

export class ListMembershipReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListMembershipRes {
  items: MembershipRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteMembershipReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteMembershipRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
