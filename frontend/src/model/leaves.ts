/** Models for table: leaves (ids are number / BIGINT) */

export class LeaveRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  type: string = "";
  fromDate: string = "";
  toDate: string = "";
  status: string = "";
  approver: string = "";
  reason: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  staffId: number = 0;
  days: number = 0;
}

export class CreateLeaveReq {
  orgId: number = 0;
  locationId: number = 0;
  type: string = "";
  fromDate: string = "";
  toDate: string = "";
  status: string = "";
  approver: string = "";
  reason: string = "";
  staffId: number = 0;
  days: number = 0;
}

export class CreateLeaveRes extends LeaveRes {}

export class UpdateLeaveReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  type: string = "";
  fromDate: string = "";
  toDate: string = "";
  status: string = "";
  approver: string = "";
  reason: string = "";
  staffId: number = 0;
  days: number = 0;
}

export class UpdateLeaveRes extends LeaveRes {}

export class GetLeaveReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetLeaveRes extends LeaveRes {
  errorMessage: string = "";
}

export class ListLeaveReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListLeaveRes {
  items: LeaveRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteLeaveReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteLeaveRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
