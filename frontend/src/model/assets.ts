/** Models for table: assets (ids are number / BIGINT) */

export class AssetRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  kind: string = "";
  mimeType: string = "";
  content: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateAssetReq {
  orgId: number = 0;
  locationId: number = 0;
  kind: string = "";
  mimeType: string = "";
  content: string = "";
}

export class CreateAssetRes extends AssetRes {}

export class UpdateAssetReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  kind: string = "";
  mimeType: string = "";
  content: string = "";
}

export class UpdateAssetRes extends AssetRes {}

export class GetAssetReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetAssetRes extends AssetRes {
  errorMessage: string = "";
}

export class ListAssetReq {
  orgId: number = 0;
  locationId: number = 0;
  kind: string = "";
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListAssetRes {
  items: AssetRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteAssetReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteAssetRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
