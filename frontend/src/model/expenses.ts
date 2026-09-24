/** Models for table: expenses (ids are number / BIGINT) */

export class ExpenseRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  category: string = "";
  vendor: string = "";
  outlet: string = "";
  date: string = "";
  amount: number = 0;
  payment: string = "";
  status: string = "";
  approver: string = "";
  notes: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  skuId: number = 0;
  sku: string = "";
  quantity: number = 0;
  stockPosted: string = "";
}

export class CreateExpenseReq {
  orgId: number = 0;
  locationId: number = 0;
  category: string = "";
  vendor: string = "";
  outlet: string = "";
  date: string = "";
  amount: number = 0;
  payment: string = "";
  status: string = "";
  approver: string = "";
  notes: string = "";
  skuId: number = 0;
  sku: string = "";
  quantity: number = 0;
  stockPosted: string = "";
}

export class CreateExpenseRes extends ExpenseRes {}

export class UpdateExpenseReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  category: string = "";
  vendor: string = "";
  outlet: string = "";
  date: string = "";
  amount: number = 0;
  payment: string = "";
  status: string = "";
  approver: string = "";
  notes: string = "";
  skuId: number = 0;
  sku: string = "";
  quantity: number = 0;
  stockPosted: string = "";
}

export class UpdateExpenseRes extends ExpenseRes {}

export class GetExpenseReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetExpenseRes extends ExpenseRes {
  errorMessage: string = "";
}

export class ListExpenseReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListExpenseRes {
  items: ExpenseRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteExpenseReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteExpenseRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
