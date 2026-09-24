/** Models for table: membershipUsage (ids are number / BIGINT) */

export class MembershipUsageRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  membershipId: number = 0;
  planId: number = 0;
  invoiceId: number = 0;
  serviceId: number = 0;
  serviceName: string = "";
  quantity: number = 0;
  type: string = "";
  status: string = "";
  usedOn: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateMembershipUsageReq {
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  membershipId: number = 0;
  planId: number = 0;
  invoiceId: number = 0;
  serviceId: number = 0;
  serviceName: string = "";
  quantity: number = 0;
  type: string = "";
  status: string = "";
  usedOn: string = "";
}

export class CreateMembershipUsageRes extends MembershipUsageRes {}

export class UpdateMembershipUsageReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  membershipId: number = 0;
  planId: number = 0;
  invoiceId: number = 0;
  serviceId: number = 0;
  serviceName: string = "";
  quantity: number = 0;
  type: string = "";
  status: string = "";
  usedOn: string = "";
}

export class UpdateMembershipUsageRes extends MembershipUsageRes {}

export class GetMembershipUsageReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetMembershipUsageRes extends MembershipUsageRes {
  errorMessage: string = "";
}

export class ListMembershipUsageReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListMembershipUsageRes {
  items: MembershipUsageRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteMembershipUsageReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteMembershipUsageRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
