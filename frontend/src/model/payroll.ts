/** Models for table: payroll (ids are number / BIGINT) */

export class PayrollRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  period: string = "";
  incentive: number = 0;
  status: string = "";
  payDate: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  staffId: number = 0;
  extraDeductions: number = 0;
}

export class CreatePayrollReq {
  orgId: number = 0;
  locationId: number = 0;
  period: string = "";
  incentive: number = 0;
  status: string = "";
  payDate: string = "";
  staffId: number = 0;
  extraDeductions: number = 0;
}

export class CreatePayrollRes extends PayrollRes {}

export class UpdatePayrollReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  period: string = "";
  incentive: number = 0;
  status: string = "";
  payDate: string = "";
  staffId: number = 0;
  extraDeductions: number = 0;
}

export class UpdatePayrollRes extends PayrollRes {}

export class GetPayrollReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetPayrollRes extends PayrollRes {
  errorMessage: string = "";
}

export class ListPayrollReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListPayrollRes {
  items: PayrollRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeletePayrollReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeletePayrollRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
