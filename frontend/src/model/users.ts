/** Models for table: users (ids are number / BIGINT) */

export class UserRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  email: string = "";
  role: string = "";
  outlet: string = "";
  permissions: string = "";
  lastLogin: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateUserReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  email: string = "";
  role: string = "";
  outlet: string = "";
  permissions: string = "";
  lastLogin: string = "";
  status: string = "";
}

export class CreateUserRes extends UserRes {}

export class UpdateUserReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  email: string = "";
  role: string = "";
  outlet: string = "";
  permissions: string = "";
  lastLogin: string = "";
  status: string = "";
}

export class UpdateUserRes extends UserRes {}

export class GetUserReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetUserRes extends UserRes {
  errorMessage: string = "";
}

export class ListUserReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListUserRes {
  items: UserRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteUserReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteUserRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}

export class UserLoginReq {
  email: string = "";
  password: string = "";
}

export class UserLoginRes {
  userId: number = 0;
  email: string = "";
  name: string = "";
  role: string = "";
  organizationId: number = 0;
  locationId: number = 0;
  organizationName: string = "";
  organizationSlug: string = "";
  access_token?: string;
  refresh_token?: string;
}

export class UserProfileUpdateReq {
  userId: number = 0;
  currentPassword: string = "";
  newEmail: string = "";
  newPassword: string = "";
  newName: string = "";
}
