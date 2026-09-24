/** Models for table: inventory (ids are number / BIGINT) */

export class InventoryRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  category: string = "";
  brand: string = "";
  outlet: string = "";
  stock: number = 0;
  reorderLevel: number = 0;
  unitCost: number = 0;
  sellPrice: number = 0;
  batch: string = "";
  expiry: string = "";
  vendorId: number = 0;
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateInventoryReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  category: string = "";
  brand: string = "";
  outlet: string = "";
  stock: number = 0;
  reorderLevel: number = 0;
  unitCost: number = 0;
  sellPrice: number = 0;
  batch: string = "";
  expiry: string = "";
  vendorId: number = 0;
}

export class CreateInventoryRes extends InventoryRes {}

export class UpdateInventoryReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  category: string = "";
  brand: string = "";
  outlet: string = "";
  stock: number = 0;
  reorderLevel: number = 0;
  unitCost: number = 0;
  sellPrice: number = 0;
  batch: string = "";
  expiry: string = "";
  vendorId: number = 0;
}

export class UpdateInventoryRes extends InventoryRes {}

export class GetInventoryReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetInventoryRes extends InventoryRes {
  errorMessage: string = "";
}

export class ListInventoryReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListInventoryRes {
  items: InventoryRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteInventoryReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteInventoryRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}

export class InventoryRemainingReq {
  orgId: number = 0;
  locationId: number = 0;
  skuId: number = 0;
}

export class InventoryRemainingRow {
  skuId: number = 0;
  remaining: number = 0;
}

export class InventoryRemainingRes {
  rows: InventoryRemainingRow[] = [];
  errorMessage: string = "";
}

export class InventoryAvailabilityLine {
  id: number = 0;
  kind: string = "";
  name: string = "";
  qty: number = 0;
}

export class InventoryCheckAvailabilityReq {
  orgId: number = 0;
  locationId: number = 0;
  lines: InventoryAvailabilityLine[] = [];
}

export class InventoryMissingProduct {
  skuId: number = 0;
  name: string = "";
  need: number = 0;
  have: number = 0;
}

export class InventoryCheckAvailabilityRes {
  ok: boolean = false;
  errorMessage: string = "";
  missing: InventoryMissingProduct[] = [];
}

export class StockAdjustReq {
  orgId: number = 0;
  locationId: number = 0;
  skuId: number = 0;
  quantity: number = 0;
  direction: string = "in";
  reason: string = "";
  date: string = "";
}

export class StockAdjustRes {
  ok: boolean = false;
  errorMessage: string = "";
  remainingAfter: number = 0;
}
