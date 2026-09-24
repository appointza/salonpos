/** Models for table: roles (ids are number / BIGINT) */

export class RoleRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  code: string = "";
  description: string = "";
  builtIn: string = "";
  view: string = "";
  edit: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateRoleReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  code: string = "";
  description: string = "";
  builtIn: string = "";
  view: string = "";
  edit: string = "";
  status: string = "";
}

export class CreateRoleRes extends RoleRes {}

export class UpdateRoleReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  code: string = "";
  description: string = "";
  builtIn: string = "";
  view: string = "";
  edit: string = "";
  status: string = "";
}

export class UpdateRoleRes extends RoleRes {}

export class GetRoleReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetRoleRes extends RoleRes {
  errorMessage: string = "";
}

export class ListRoleReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListRoleRes {
  items: RoleRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteRoleReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteRoleRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
