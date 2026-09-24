/** Models for table: vendors (ids are number / BIGINT) */

export class VendorRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  contact: string = "";
  phone: string = "";
  email: string = "";
  gstin: string = "";
  outlet: string = "";
  category: string = "";
  status: string = "";
  notes: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateVendorReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  contact: string = "";
  phone: string = "";
  email: string = "";
  gstin: string = "";
  outlet: string = "";
  category: string = "";
  status: string = "";
  notes: string = "";
}

export class CreateVendorRes extends VendorRes {}

export class UpdateVendorReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  contact: string = "";
  phone: string = "";
  email: string = "";
  gstin: string = "";
  outlet: string = "";
  category: string = "";
  status: string = "";
  notes: string = "";
}

export class UpdateVendorRes extends VendorRes {}

export class GetVendorReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetVendorRes extends VendorRes {
  errorMessage: string = "";
}

export class ListVendorReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListVendorRes {
  items: VendorRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteVendorReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteVendorRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
