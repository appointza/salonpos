/** Models for table: commissions (ids are number / BIGINT) */

export class CommissionRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  type: string = "";
  baseAmount: number = 0;
  rate: number = 0;
  amount: number = 0;
  date: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  staffId: number = 0;
  invoiceId: number = 0;
  serviceId: number = 0;
  item: string = "";
}

export class CreateCommissionReq {
  orgId: number = 0;
  locationId: number = 0;
  type: string = "";
  baseAmount: number = 0;
  rate: number = 0;
  amount: number = 0;
  date: string = "";
  status: string = "";
  staffId: number = 0;
  invoiceId: number = 0;
  serviceId: number = 0;
  item: string = "";
}

export class CreateCommissionRes extends CommissionRes {}

export class UpdateCommissionReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  type: string = "";
  baseAmount: number = 0;
  rate: number = 0;
  amount: number = 0;
  date: string = "";
  status: string = "";
  staffId: number = 0;
  invoiceId: number = 0;
  serviceId: number = 0;
  item: string = "";
}

export class UpdateCommissionRes extends CommissionRes {}

export class GetCommissionReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetCommissionRes extends CommissionRes {
  errorMessage: string = "";
}

export class ListCommissionReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListCommissionRes {
  items: CommissionRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteCommissionReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteCommissionRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
