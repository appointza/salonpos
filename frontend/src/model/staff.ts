/** Models for table: staff (ids are number / BIGINT) */

export class StaffRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  role: string = "";
  outlet: string = "";
  phone: string = "";
  email: string = "";
  joinDate: string = "";
  baseSalary: number = 0;
  commissionRate: number = 0;
  target: number = 0;
  status: string = "";
  address: string = "";
  bankName: string = "";
  bankAccount: string = "";
  bankIfsc: string = "";
  idProofType: string = "";
  idProofRef: string = "";
  addressProofType: string = "";
  addressProofRef: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateStaffReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  role: string = "";
  outlet: string = "";
  phone: string = "";
  email: string = "";
  joinDate: string = "";
  baseSalary: number = 0;
  commissionRate: number = 0;
  target: number = 0;
  status: string = "";
  address: string = "";
  bankName: string = "";
  bankAccount: string = "";
  bankIfsc: string = "";
  idProofType: string = "";
  idProofRef: string = "";
  addressProofType: string = "";
  addressProofRef: string = "";
}

export class CreateStaffRes extends StaffRes {}

export class UpdateStaffReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  role: string = "";
  outlet: string = "";
  phone: string = "";
  email: string = "";
  joinDate: string = "";
  baseSalary: number = 0;
  commissionRate: number = 0;
  target: number = 0;
  status: string = "";
  address: string = "";
  bankName: string = "";
  bankAccount: string = "";
  bankIfsc: string = "";
  idProofType: string = "";
  idProofRef: string = "";
  addressProofType: string = "";
  addressProofRef: string = "";
}

export class UpdateStaffRes extends StaffRes {}

export class GetStaffReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetStaffRes extends StaffRes {
  errorMessage: string = "";
}

export class ListStaffReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListStaffRes {
  items: StaffRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteStaffReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteStaffRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
