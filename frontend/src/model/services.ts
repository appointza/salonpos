/** Models for table: services (ids are number / BIGINT) */

export class ServiceRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  category: string = "";
  duration: number = 0;
  price: number = 0;
  gstRate: number = 0;
  commission: number = 0;
  outlet: string = "";
  active: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  type: string = "";
  comboItems: string = "";
  productNeeds: string = "";
}

export class CreateServiceReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  category: string = "";
  duration: number = 0;
  price: number = 0;
  gstRate: number = 0;
  commission: number = 0;
  outlet: string = "";
  active: string = "";
  type: string = "";
  comboItems: string = "";
  productNeeds: string = "";
}

export class CreateServiceRes extends ServiceRes {}

export class UpdateServiceReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  category: string = "";
  duration: number = 0;
  price: number = 0;
  gstRate: number = 0;
  commission: number = 0;
  outlet: string = "";
  active: string = "";
  type: string = "";
  comboItems: string = "";
  productNeeds: string = "";
}

export class UpdateServiceRes extends ServiceRes {}

export class GetServiceReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetServiceRes extends ServiceRes {
  errorMessage: string = "";
}

export class ListServiceReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListServiceRes {
  items: ServiceRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteServiceReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteServiceRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
