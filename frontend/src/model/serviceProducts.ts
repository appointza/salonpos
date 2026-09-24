/** Models for table: serviceProducts (ids are number / BIGINT) */

export class ServiceProductRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  serviceId: number = 0;
  sku: string = "";
  skuId: number = 0;
  quantity: number = 0;
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateServiceProductReq {
  orgId: number = 0;
  locationId: number = 0;
  serviceId: number = 0;
  sku: string = "";
  skuId: number = 0;
  quantity: number = 0;
}

export class CreateServiceProductRes extends ServiceProductRes {}

export class UpdateServiceProductReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  serviceId: number = 0;
  sku: string = "";
  skuId: number = 0;
  quantity: number = 0;
}

export class UpdateServiceProductRes extends ServiceProductRes {}

export class GetServiceProductReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetServiceProductRes extends ServiceProductRes {
  errorMessage: string = "";
}

export class ListServiceProductReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListServiceProductRes {
  items: ServiceProductRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteServiceProductReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteServiceProductRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
