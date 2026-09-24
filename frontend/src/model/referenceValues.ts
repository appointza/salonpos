/** Models for table: referenceValues (ids are number / BIGINT) */

export class ReferenceValueRes {
  referenceType: string = "";
  id: number = 0;
  name: string = "";
  value: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  orgId: number = 0;
  displayOrder: number = 0;
}

export class CreateReferenceValueReq {
  referenceType: string = "";
  name: string = "";
  value: string = "";
  status: string = "";
  orgId: number = 0;
  displayOrder: number = 0;
}

export class CreateReferenceValueRes extends ReferenceValueRes {}

export class UpdateReferenceValueReq {
  id: number = 0;
  referenceType: string = "";
  name: string = "";
  value: string = "";
  status: string = "";
  orgId: number = 0;
  displayOrder: number = 0;
}

export class UpdateReferenceValueRes extends ReferenceValueRes {}

export class GetReferenceValueReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetReferenceValueRes extends ReferenceValueRes {
  errorMessage: string = "";
}

export class ListReferenceValueReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListReferenceValueRes {
  items: ReferenceValueRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteReferenceValueReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteReferenceValueRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
