/** Models for table: franchises (ids are number / BIGINT) */

export class FranchiseRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  type: string = "";
  city: string = "";
  owner: string = "";
  phone: string = "";
  gstin: string = "";
  royalty: number = 0;
  goLive: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateFranchiseReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  type: string = "";
  city: string = "";
  owner: string = "";
  phone: string = "";
  gstin: string = "";
  royalty: number = 0;
  goLive: string = "";
  status: string = "";
}

export class CreateFranchiseRes extends FranchiseRes {}

export class UpdateFranchiseReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  type: string = "";
  city: string = "";
  owner: string = "";
  phone: string = "";
  gstin: string = "";
  royalty: number = 0;
  goLive: string = "";
  status: string = "";
}

export class UpdateFranchiseRes extends FranchiseRes {}

export class GetFranchiseReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetFranchiseRes extends FranchiseRes {
  errorMessage: string = "";
}

export class ListFranchiseReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListFranchiseRes {
  items: FranchiseRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteFranchiseReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteFranchiseRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
