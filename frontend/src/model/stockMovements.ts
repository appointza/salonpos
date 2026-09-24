/** Models for table: stockMovements (ids are number / BIGINT) */

export class StockMovementRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  sku: string = "";
  skuId: number = 0;
  skuName: string = "";
  customerId: number = 0;
  invoiceId: number = 0;
  expenseId: number = 0;
  type: string = "";
  quantity: number = 0;
  qtyIn: number = 0;
  qtyOut: number = 0;
  date: string = "";
  balanceBefore: number = 0;
  balanceAfter: number = 0;
  reason: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateStockMovementReq {
  orgId: number = 0;
  locationId: number = 0;
  sku: string = "";
  skuId: number = 0;
  skuName: string = "";
  customerId: number = 0;
  invoiceId: number = 0;
  expenseId: number = 0;
  type: string = "";
  quantity: number = 0;
  qtyIn: number = 0;
  qtyOut: number = 0;
  date: string = "";
  balanceBefore: number = 0;
  balanceAfter: number = 0;
  reason: string = "";
  status: string = "";
}

export class CreateStockMovementRes extends StockMovementRes {}

export class UpdateStockMovementReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  sku: string = "";
  skuId: number = 0;
  skuName: string = "";
  customerId: number = 0;
  invoiceId: number = 0;
  expenseId: number = 0;
  type: string = "";
  quantity: number = 0;
  qtyIn: number = 0;
  qtyOut: number = 0;
  date: string = "";
  balanceBefore: number = 0;
  balanceAfter: number = 0;
  reason: string = "";
  status: string = "";
}

export class UpdateStockMovementRes extends StockMovementRes {}

export class GetStockMovementReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetStockMovementRes extends StockMovementRes {
  errorMessage: string = "";
}

export class ListStockMovementReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListStockMovementRes {
  items: StockMovementRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteStockMovementReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteStockMovementRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
