/** Models for table: brandApps (ids are number / BIGINT) */

export class BrandAppRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  outlet: string = "";
  appName: string = "";
  primaryColor: string = "";
  bundleId: string = "";
  platform: string = "";
  version: string = "";
  website: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateBrandAppReq {
  orgId: number = 0;
  locationId: number = 0;
  outlet: string = "";
  appName: string = "";
  primaryColor: string = "";
  bundleId: string = "";
  platform: string = "";
  version: string = "";
  website: string = "";
  status: string = "";
}

export class CreateBrandAppRes extends BrandAppRes {}

export class UpdateBrandAppReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  outlet: string = "";
  appName: string = "";
  primaryColor: string = "";
  bundleId: string = "";
  platform: string = "";
  version: string = "";
  website: string = "";
  status: string = "";
}

export class UpdateBrandAppRes extends BrandAppRes {}

export class GetBrandAppReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetBrandAppRes extends BrandAppRes {
  errorMessage: string = "";
}

export class ListBrandAppReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListBrandAppRes {
  items: BrandAppRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteBrandAppReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteBrandAppRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
